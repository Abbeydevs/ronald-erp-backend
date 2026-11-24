import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import {
  AudienceContactSource,
  CampaignRecipientStatus,
  CampaignStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignBatchItem, EmailService } from '../email/email.service';
import {
  AddContactsToAudienceDto,
  CreateAudienceDto,
} from './dto/audience.dto';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

export interface ResendWebhookPayload {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
  };
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private readonly BATCH_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async createAudience(dto: CreateAudienceDto, userId: string) {
    return this.prisma.emailAudience.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        createdById: userId,
      },
      include: {
        _count: { select: { contacts: true } },
      },
    });
  }

  async getAllAudiences() {
    return this.prisma.emailAudience.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { contacts: true, campaigns: true } },
      },
    });
  }

  async getAudienceById(id: string) {
    const audience = await this.prisma.emailAudience.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        contacts: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!audience) {
      throw new NotFoundException(`Audience ${id} not found.`);
    }

    return audience;
  }

  async deleteAudience(id: string) {
    const audience = await this.prisma.emailAudience.findUnique({
      where: { id },
      include: { _count: { select: { campaigns: true } } },
    });

    if (!audience) {
      throw new NotFoundException(`Audience ${id} not found.`);
    }

    if (audience._count.campaigns > 0) {
      throw new BadRequestException(
        'Cannot delete an audience that is linked to existing campaigns.',
      );
    }

    await this.prisma.emailAudience.delete({ where: { id } });
    return { message: 'Audience deleted successfully.' };
  }

  async addContactsToAudience(
    audienceId: string,
    dto: AddContactsToAudienceDto,
  ) {
    const audience = await this.prisma.emailAudience.findUnique({
      where: { id: audienceId },
    });

    if (!audience) {
      throw new NotFoundException(`Audience ${audienceId} not found.`);
    }

    const recordsToInsert: Array<{
      audienceId: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      source: AudienceContactSource;
      leadId: string | null;
    }> = [];

    if (dto.leadIds && dto.leadIds.length > 0) {
      const leads = await this.prisma.lead.findMany({
        where: {
          id: { in: dto.leadIds },
          email: { not: null },
        },
        include: {
          applications: { select: { id: true }, take: 1 },
        },
      });

      for (const lead of leads) {
        if (!lead.email) continue;
        const normalizedEmail = lead.email.trim().toLowerCase();
        const isStudent =
          lead.applications.length > 0 || Boolean(lead.studentId);

        recordsToInsert.push({
          audienceId,
          email: normalizedEmail,
          firstName: lead.firstName || null,
          lastName: lead.lastName || null,
          source: isStudent
            ? AudienceContactSource.STUDENT
            : AudienceContactSource.LEAD,
          leadId: lead.id,
        });
      }
    }

    if (dto.contacts && dto.contacts.length > 0) {
      for (const contact of dto.contacts) {
        recordsToInsert.push({
          audienceId,
          email: contact.email.trim().toLowerCase(),
          firstName: contact.firstName?.trim() || null,
          lastName: contact.lastName?.trim() || null,
          source: contact.source || AudienceContactSource.MANUAL,
          leadId: null,
        });
      }
    }

    if (recordsToInsert.length === 0) {
      throw new BadRequestException('No valid contacts provided to add.');
    }

    const result = await this.prisma.audienceContact.createMany({
      data: recordsToInsert,
      skipDuplicates: true,
    });

    return {
      message: `Added ${result.count} new contact(s) to ${audience.name}.`,
      addedCount: result.count,
    };
  }

  async removeContactFromAudience(audienceId: string, contactId: string) {
    const contact = await this.prisma.audienceContact.findFirst({
      where: { id: contactId, audienceId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found in this audience.');
    }

    await this.prisma.audienceContact.delete({ where: { id: contactId } });
    return { message: 'Contact removed from audience.' };
  }

  async exportAudienceCsv(audienceId: string): Promise<{
    filename: string;
    csv: string;
  }> {
    const audience = await this.getAudienceById(audienceId);
    const header = 'Email,First Name,Last Name,Source,Added At';

    const escapeCsv = (value: string | null | undefined): string => {
      const safe = (value ?? '').replace(/"/g, '""');
      return `"${safe}"`;
    };

    const rows = audience.contacts.map((c) =>
      [
        escapeCsv(c.email),
        escapeCsv(c.firstName),
        escapeCsv(c.lastName),
        escapeCsv(c.source),
        escapeCsv(c.createdAt.toISOString()),
      ].join(','),
    );

    const safeName = audience.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return {
      filename: `${safeName}-contacts.csv`,
      csv: [header, ...rows].join('\n'),
    };
  }

  async createCampaign(dto: CreateCampaignDto, userId: string) {
    const audience = await this.prisma.emailAudience.findUnique({
      where: { id: dto.audienceId },
    });

    if (!audience) {
      throw new NotFoundException(`Audience ${dto.audienceId} not found.`);
    }

    const scheduledDate = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (scheduledDate && scheduledDate <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future.');
    }

    return this.prisma.emailCampaign.create({
      data: {
        name: dto.name.trim(),
        subject: dto.subject.trim(),
        bodyHtml: dto.bodyHtml,
        replyTo: dto.replyTo?.trim(),
        audienceId: dto.audienceId,
        createdById: userId,
        status: scheduledDate ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
        scheduledAt: scheduledDate,
      },
      include: {
        audience: {
          select: {
            id: true,
            name: true,
            _count: { select: { contacts: true } },
          },
        },
      },
    });
  }

  async getAllCampaigns() {
    return this.prisma.emailCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        audience: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async getCampaignById(id: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        audience: {
          select: {
            id: true,
            name: true,
            _count: { select: { contacts: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        recipients: { orderBy: { createdAt: 'desc' }, take: 200 },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }

    return campaign;
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }

    if (
      campaign.status !== CampaignStatus.DRAFT &&
      campaign.status !== CampaignStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'Only DRAFT or SCHEDULED campaigns can be edited.',
      );
    }

    const scheduledDate = dto.scheduledAt
      ? new Date(dto.scheduledAt)
      : undefined;

    return this.prisma.emailCampaign.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.subject && { subject: dto.subject.trim() }),
        ...(dto.bodyHtml && { bodyHtml: dto.bodyHtml }),
        ...(dto.audienceId && { audienceId: dto.audienceId }),
        ...(dto.replyTo !== undefined && { replyTo: dto.replyTo }),
        ...(scheduledDate && {
          scheduledAt: scheduledDate,
          status: CampaignStatus.SCHEDULED,
        }),
      },
    });
  }

  async deleteCampaign(id: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }

    if (campaign.status === CampaignStatus.SENDING) {
      throw new BadRequestException(
        'Cannot delete a campaign while it is actively sending.',
      );
    }

    await this.prisma.emailCampaign.delete({ where: { id } });
    return { message: 'Campaign deleted successfully.' };
  }

  async sendTestEmail(campaignId: string, testEmail: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found.`);
    }

    const unsubscribeUrl = this.buildUnsubscribeUrl(testEmail);
    const html = this.buildFinalHtml(
      campaign.bodyHtml,
      'Test User',
      unsubscribeUrl,
    );

    const sent = await this.emailService.sendCampaignTestEmail(
      testEmail,
      campaign.subject,
      html,
      campaign.replyTo ?? undefined,
    );

    if (!sent) {
      throw new BadRequestException(
        'Failed to dispatch test email via Resend.',
      );
    }

    return { message: `Test email sent to ${testEmail}.` };
  }

  async launchCampaign(campaignId: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        audience: { include: { contacts: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found.`);
    }

    if (
      campaign.status === CampaignStatus.SENDING ||
      campaign.status === CampaignStatus.SENT
    ) {
      throw new BadRequestException('This campaign has already been sent.');
    }

    const allContacts = campaign.audience.contacts;
    if (allContacts.length === 0) {
      throw new BadRequestException(
        'Cannot send campaign: the selected audience has 0 contacts.',
      );
    }

    // Filter out globally unsubscribed emails
    const unsubscribedRecords = await this.prisma.unsubscribedEmail.findMany({
      where: {
        email: { in: allContacts.map((c) => c.email.toLowerCase()) },
      },
      select: { email: true },
    });

    const unsubscribedSet = new Set(
      unsubscribedRecords.map((u) => u.email.toLowerCase()),
    );

    const eligibleContacts = allContacts.filter(
      (c) => !unsubscribedSet.has(c.email.toLowerCase()),
    );

    if (eligibleContacts.length === 0) {
      throw new BadRequestException(
        'All contacts in this audience have unsubscribed.',
      );
    }

    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SENDING,
        totalRecipients: eligibleContacts.length,
      },
    });

    let totalSent = 0;

    // Dispatch in batches of 100 (Resend Batch API limit)
    for (let i = 0; i < eligibleContacts.length; i += this.BATCH_SIZE) {
      const chunk = eligibleContacts.slice(i, i + this.BATCH_SIZE);

      const batchItems: CampaignBatchItem[] = chunk.map((contact) => {
        const unsubscribeUrl = this.buildUnsubscribeUrl(contact.email);
        return {
          to: contact.email,
          subject: campaign.subject,
          html: this.buildFinalHtml(
            campaign.bodyHtml,
            contact.firstName,
            unsubscribeUrl,
          ),
          replyTo: campaign.replyTo ?? undefined,
          unsubscribeUrl,
        };
      });

      const result = await this.emailService.sendCampaignBatch(batchItems);

      if (result.success) {
        totalSent += chunk.length;

        await this.prisma.campaignRecipient.createMany({
          data: chunk.map((contact, idx) => ({
            campaignId,
            email: contact.email,
            firstName: contact.firstName,
            resendEmailId: result.emailIds[idx] ?? null,
            status: CampaignRecipientStatus.SENT,
          })),
        });
      } else {
        await this.prisma.campaignRecipient.createMany({
          data: chunk.map((contact) => ({
            campaignId,
            email: contact.email,
            firstName: contact.firstName,
            status: CampaignRecipientStatus.FAILED,
          })),
        });
      }
    }

    const finalStatus =
      totalSent > 0 ? CampaignStatus.SENT : CampaignStatus.FAILED;

    const updated = await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sentCount: totalSent,
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `Campaign "${campaign.name}" finished. Sent: ${totalSent}/${eligibleContacts.length}`,
    );

    return updated;
  }

  // Runs every minute to trigger scheduled campaigns automatically
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCampaigns() {
    const dueCampaigns = await this.prisma.emailCampaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
      select: { id: true, name: true },
    });

    for (const campaign of dueCampaigns) {
      this.logger.log(`Triggering scheduled campaign: ${campaign.name}`);
      try {
        await this.launchCampaign(campaign.id);
      } catch (error) {
        this.logger.error(`Scheduled campaign ${campaign.id} failed`, error);
      }
    }
  }

  async handleUnsubscribe(email: string, token: string): Promise<string> {
    const normalizedEmail = email.trim().toLowerCase();
    const expectedToken = this.generateUnsubscribeToken(normalizedEmail);

    if (token !== expectedToken) {
      throw new BadRequestException('Invalid unsubscribe link.');
    }

    await this.prisma.unsubscribedEmail.upsert({
      where: { email: normalizedEmail },
      update: { unsubscribedAt: new Date() },
      create: { email: normalizedEmail, reason: 'User clicked unsubscribe' },
    });

    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 60px auto; text-align: center; padding: 32px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #0fa3b1; margin-top: 0;">You have been unsubscribed</h2>
        <p style="color: #475569;"><strong>${normalizedEmail}</strong> will no longer receive marketing campaigns from Ronald Partners.</p>
        <p style="font-size: 13px; color: #94a3b8;">Note: If you have an active university or visa application with us, you will still receive essential application updates.</p>
      </div>
    `;
  }

  async handleResendWebhook(payload: ResendWebhookPayload) {
    const emailId = payload.data?.email_id;
    if (!emailId) return { received: true };

    const recipient = await this.prisma.campaignRecipient.findUnique({
      where: { resendEmailId: emailId },
    });

    if (!recipient) return { received: true };

    if (
      payload.type === 'email.delivered' &&
      recipient.status === CampaignRecipientStatus.SENT
    ) {
      await this.prisma.$transaction([
        this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: CampaignRecipientStatus.DELIVERED },
        }),
        this.prisma.emailCampaign.update({
          where: { id: recipient.campaignId },
          data: { deliveredCount: { increment: 1 } },
        }),
      ]);
    } else if (payload.type === 'email.opened' && !recipient.openedAt) {
      await this.prisma.$transaction([
        this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: CampaignRecipientStatus.OPENED,
            openedAt: new Date(),
          },
        }),
        this.prisma.emailCampaign.update({
          where: { id: recipient.campaignId },
          data: { openedCount: { increment: 1 } },
        }),
      ]);
    } else if (payload.type === 'email.clicked' && !recipient.clickedAt) {
      await this.prisma.$transaction([
        this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: CampaignRecipientStatus.CLICKED,
            clickedAt: new Date(),
          },
        }),
        this.prisma.emailCampaign.update({
          where: { id: recipient.campaignId },
          data: { clickedCount: { increment: 1 } },
        }),
      ]);
    } else if (payload.type === 'email.bounced' && !recipient.bouncedAt) {
      await this.prisma.$transaction([
        this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: CampaignRecipientStatus.BOUNCED,
            bouncedAt: new Date(),
          },
        }),
        this.prisma.emailCampaign.update({
          where: { id: recipient.campaignId },
          data: { bouncedCount: { increment: 1 } },
        }),
      ]);
    }

    return { received: true };
  }

  private generateUnsubscribeToken(email: string): string {
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
    return crypto
      .createHmac('sha256', secret)
      .update(email.toLowerCase())
      .digest('hex');
  }

  private buildUnsubscribeUrl(email: string): string {
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const token = this.generateUnsubscribeToken(email);
    return `${baseUrl}/campaigns/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
  }

  private buildFinalHtml(
    bodyHtml: string,
    firstName: string | null | undefined,
    unsubscribeUrl: string,
  ): string {
    const safeName = firstName?.trim() || 'there';
    const personalizedBody = bodyHtml.replace(
      /\{\{\s*firstName\s*\}\}/gi,
      safeName,
    );

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b; line-height: 1.6;">
        ${personalizedBody}
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          Sent by Ronald Partners Consult.<br/>
          Don't want to receive these updates?
          <a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `;
  }
}
