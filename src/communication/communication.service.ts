import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CommType } from '@prisma/client';
import { SaveCallLogDto, ScheduleMeetDto, SendEmailDto } from './dto';
import { GoogleCalendarService } from './google-calendar/google-calendar.service';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { ResendInboundEmailPayload } from './dto/resend-webhook.dto';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly emailService: EmailService,
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async saveCallLog(dto: SaveCallLogDto, file?: Express.Multer.File) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${dto.leadId} not found`);
    }

    let recordingUrl: string | null = null;

    if (file) {
      try {
        const uploadResult = await new Promise<UploadApiResponse>(
          (resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'ronald_crm_recordings',
                resource_type: 'video',
              },
              (error, result) => {
                if (error) {
                  return reject(
                    new Error(error.message || 'Unknown Cloudinary error'),
                  );
                }
                if (!result) {
                  return reject(
                    new Error('Cloudinary returned an empty result'),
                  );
                }
                resolve(result);
              },
            );
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
          },
        );

        recordingUrl = uploadResult.secure_url;
      } catch (error) {
        this.logger.error('Failed to upload recording to Cloudinary', error);
      }
    }

    const now = new Date();

    const log = await this.prisma.communicationLog.create({
      data: {
        leadId: dto.leadId,
        counsellorId: dto.counsellorId,
        type: CommType.CALL,
        duration: dto.duration ? Number(dto.duration) : 0,
        notes: dto.notes || null,
        recordingUrl,
      },
    });

    await this.prisma.lead.update({
      where: { id: dto.leadId },
      data: { lastCommunicatedAt: now },
    });

    this.logger.log(
      `Saved call recording for lead ${dto.leadId} (Log ID: ${log.id})`,
    );
    return log;
  }

  async scheduleMeet(dto: ScheduleMeetDto, counsellorId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });

    if (!lead || !lead.email) {
      throw new BadRequestException(
        'Lead not found or does not have a valid email address.',
      );
    }

    const startTime = new Date(dto.scheduledAt);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid date format for scheduledAt.');
    }

    const durationMinutes = dto.durationMinutes || 30;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const meeting = await this.googleCalendarService.createGoogleMeet({
      summary: dto.summary,
      description: dto.description,
      startTime,
      endTime,
      attendeeEmail: lead.email,
    });

    const now = new Date();

    const log = await this.prisma.communicationLog.create({
      data: {
        leadId: dto.leadId,
        counsellorId,
        type: CommType.MEETING,
        subject: dto.summary,
        notes: dto.description,
        meetUrl: meeting.meetUrl,
        scheduledAt: startTime,
      },
    });

    const studentName =
      `${lead.firstName} ${lead.lastName}`.trim() || 'Student';

    await this.emailService.sendMeetingInviteEmail(
      lead.email,
      studentName,
      meeting.meetUrl,
      startTime,
    );

    await this.prisma.lead.update({
      where: { id: dto.leadId },
      data: { lastCommunicatedAt: now },
    });

    return log;
  }

  async sendEmailToStudent(dto: SendEmailDto, counsellorId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });

    if (!lead || !lead.email) {
      throw new BadRequestException(
        'Lead not found or does not have a valid email address.',
      );
    }

    // Generate the unique reply routing address for this specific lead
    const replyToAddress = `reply+${lead.id}@replies.ronaldpartners.com`;

    const dispatched = await this.emailService.sendStudentEmail(
      lead.email,
      dto.subject,
      dto.content,
      replyToAddress,
    );

    if (!dispatched) {
      throw new BadRequestException('Failed to dispatch email via Resend.');
    }

    const now = new Date();

    const log = await this.prisma.communicationLog.create({
      data: {
        leadId: dto.leadId,
        counsellorId,
        type: CommType.EMAIL,
        subject: dto.subject,
        content: dto.content,
      },
    });

    await this.prisma.lead.update({
      where: { id: dto.leadId },
      data: { lastCommunicatedAt: now },
    });

    return log;
  }

  async handleInboundEmailWebhook(payload: ResendInboundEmailPayload) {
    if (payload.type !== 'email.received' || !payload.data) {
      return { received: true };
    }

    const emailData = payload.data;

    if (!emailData.to || emailData.to.length === 0) {
      return { received: true };
    }

    const toAddress = emailData.to[0];
    const match = toAddress.match(/reply\+(.*?)@/);

    if (!match) {
      this.logger.warn(`Could not extract lead ID from address: ${toAddress}`);
      return { received: true };
    }

    const leadId = match[1];

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      this.logger.warn(`Received email for unknown lead ID: ${leadId}`);
      return { received: true };
    }

    let targetCounsellorId = lead.assignedToId;

    if (!targetCounsellorId) {
      const systemCounsellor = await this.prisma.user.findFirst();
      if (!systemCounsellor) {
        this.logger.error(
          'Cannot log inbound email: No counsellor assigned and no system users exist.',
        );
        return { received: true };
      }
      targetCounsellorId = systemCounsellor.id;
    }

    await this.prisma.communicationLog.create({
      data: {
        leadId: lead.id,
        counsellorId: targetCounsellorId,
        type: CommType.EMAIL,
        subject: emailData.subject.startsWith('Re:')
          ? emailData.subject
          : `Re: ${emailData.subject}`,
        content: emailData.text || emailData.html || 'No content provided.',
      },
    });

    this.logger.log(`Successfully logged inbound email for lead: ${leadId}`);
    return { received: true };
  }

  async getLogsForLead(leadId: string) {
    return this.prisma.communicationLog.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        counsellor: { select: { id: true, name: true, email: true } },
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleThreeDayNudgeCron() {
    this.logger.log('Running 3-Day Inactive Lead Nudge Cron Routine...');

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const inactiveLeads = await this.prisma.lead.findMany({
      where: {
        email: { not: null },
        OR: [
          { lastCommunicatedAt: { lte: threeDaysAgo } },
          { lastCommunicatedAt: null },
        ],
      },
      take: 50,
    });

    this.logger.log(
      `Found ${inactiveLeads.length} inactive leads for nudging.`,
    );

    for (const lead of inactiveLeads) {
      if (!lead.email) continue;

      const studentName =
        `${lead.firstName} ${lead.lastName}`.trim() || 'Student';
      const subject = 'Checking in on your application - Ronald Partners';
      const bodyHtml = `
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>We noticed it's been a few days since our last interaction. Our admissions counselors are ready to assist you with the next steps in your application.</p>
        <p>If you have any questions or need guidance, simply reply to this email or request a call through your student portal.</p>
        <p>Best regards,<br/>Ronald Partners Admissions Team</p>
      `;

      const sent = await this.emailService.sendStudentEmail(
        lead.email,
        subject,
        bodyHtml,
      );

      if (sent) {
        const systemCounsellor = await this.prisma.user.findFirst();

        if (systemCounsellor) {
          await this.prisma.communicationLog.create({
            data: {
              leadId: lead.id,
              counsellorId: systemCounsellor.id,
              type: CommType.EMAIL,
              subject: `[Automated 3-Day Nudge] ${subject}`,
              content: bodyHtml,
              notes: 'Triggered by automated 3-day inactivity cron job.',
            },
          });
        }

        await this.prisma.lead.update({
          where: { id: lead.id },
          data: { lastCommunicatedAt: new Date() },
        });

        this.logger.log(`Nudge email sent to lead ${lead.id} (${lead.email})`);
      }
    }
  }
}
