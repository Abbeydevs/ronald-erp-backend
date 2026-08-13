import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Role, ApplicationStage, LeadStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async onboardStudent(leadId: string, counsellorId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { applications: true },
    });

    if (!lead) {
      throw new BadRequestException('Lead not found.');
    }
    if (!lead.email) {
      throw new BadRequestException(
        'Cannot onboard a student without an email address.',
      );
    }
    if (lead.studentId || lead.applications.length > 0) {
      throw new BadRequestException(
        'This lead has already been onboarded as a student.',
      );
    }

    await this.prisma.invitation.deleteMany({
      where: { email: lead.email, isUsed: false },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const inviteUrl = `${frontendBaseUrl}/register?token=${rawToken}`;
    const studentName = `${lead.firstName} ${lead.lastName}`.trim();

    await this.prisma.$transaction(async (prisma) => {
      await prisma.invitation.create({
        data: {
          email: lead.email!,
          role: Role.STUDENT,
          token: rawToken,
          expiresAt,
          generatedById: counsellorId,
        },
      });

      await prisma.application.create({
        data: {
          leadId: lead.id,
          counsellorId: counsellorId,
          stage: ApplicationStage.DOCUMENT_GATHERING,
        },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: LeadStatus.CONVERTED },
      });
    });

    await this.emailService.sendStudentPortalInvite(
      lead.email,
      studentName,
      inviteUrl,
    );

    this.logger.log(
      `Successfully onboarded lead ${lead.id} to student portal.`,
    );

    return {
      message: 'Student onboarded successfully. Portal invitation sent.',
    };
  }
}
