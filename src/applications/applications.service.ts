import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStage, Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { UpdateStageDto } from './dto/update-stage.dto';
import { SubmitProofOfWorkDto } from './dto/submit-proof-of-work.dto';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { EmailService } from 'src/email/email.service';

const STAGE_TASKS: Record<ApplicationStage, string[]> = {
  CONSULTATION_AND_DOCUMENTS: [
    'Contact student directly (social media/referral)',
    'Receive documents after consultation (university, course, tuition)',
  ],
  COMPLIANCE_REVIEW: [
    'Go through all documents carefully to detect any false documents',
    'Work on correcting/fixing any flagged documents',
  ],
  SCHOOL_APPLYING: [
    'Suggest 2-3 schools to make application for the student',
    'Complete application and edit documents (SOP and CV)',
    'Resend edited documents to student for review/awareness',
  ],
  OFFER_AND_CONDITIONS: [
    'Receive offer from school and send to student',
    'Start preparing student for school interview',
    'Fulfill conditions (e.g., pay tuition deposit, request name/age affidavit)',
  ],
  INTERVIEW_CLEARANCE: [
    'Start running 1st month Proof of Funds (POF)',
    'Send possible interview questions & prep via phone call',
    'Student takes and passes interview (Enroly CAS Shield / Online)',
    'Submit 28-day Bank statement (submitted on the 29th day)',
    'Student pays for 2nd month POF renewal (for CAS/Visa processing)',
  ],
  CAS_AND_MEDICALS: [
    'Book Tuberculosis test X-ray at IOM (Lagos, Benin, or Abuja)',
    'Receive CAS (Confirmation of Acceptance of Studies) from school',
  ],
  VISA_PREPARATION: [
    'Apply for student visa and pay Visa & IHS fee',
    'Upload all required visa documents on the visa website',
    'Student goes for biometrics/capturing at VFS office with checklist',
  ],
  VISA_DECISION_PENDING: [
    'Run one-week POF consistently until visa decision is out',
    'Prepare student for potential UKVI interview (in case of delay)',
  ],
};

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private async syncStageTasks(applicationId: string, stage: ApplicationStage) {
    const requiredTasks = STAGE_TASKS[stage] || [];
    if (requiredTasks.length === 0) return;

    const existingTasks = await this.prisma.applicationTask.findMany({
      where: { applicationId },
      select: { title: true },
    });

    const existingTitles = new Set(existingTasks.map((t) => t.title));
    const tasksToCreate = requiredTasks.filter((t) => !existingTitles.has(t));

    if (tasksToCreate.length > 0) {
      await this.prisma.applicationTask.createMany({
        data: tasksToCreate.map((title) => ({
          applicationId,
          title,
          isCompleted: false,
        })),
      });
      this.logger.log(
        `Injected ${tasksToCreate.length} new tasks for Application ${applicationId}`,
      );
    }
  }

  async getBoardApplications(user: { id: string; role: Role }) {
    const whereClause: Prisma.ApplicationWhereInput = {};

    if (user.role === Role.ADMISSIONS_COUNSELLOR) {
      whereClause.counsellorId = user.id;
    } else if (user.role === Role.FINANCE_OFFICER) {
      whereClause.OR = [{ financeId: user.id }];
    } else if (user.role === Role.VISA_OFFICER) {
      whereClause.OR = [
        { visaId: user.id },
        {
          stage: {
            in: [
              ApplicationStage.VISA_PREPARATION,
              ApplicationStage.VISA_DECISION_PENDING,
            ],
          },
        },
      ];
    }

    return this.prisma.application.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryChoice: true,
            courseOfStudy: true,
            studentId: true,
          },
        },
        tasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateApplicationStage(id: string, dto: UpdateStageDto) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found.`);
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: { stage: dto.stage },
    });

    await this.syncStageTasks(id, dto.stage);

    this.logger.log(`Application ${id} moved to stage ${dto.stage}`);
    return updated;
  }

  async submitProofOfWork(
    applicationId: string,
    staffId: string,
    dto: SubmitProofOfWorkDto,
    file?: Express.Multer.File,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { lead: true },
    });

    if (!application) {
      throw new NotFoundException(
        `Application with ID ${applicationId} not found.`,
      );
    }

    let proofUrl = '';

    if (file) {
      try {
        const uploadResult = await new Promise<UploadApiResponse>(
          (resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'ronald_crm_proof_of_work',
                resource_type: 'auto',
              },
              (error, result) => {
                if (error) return reject(new Error(error.message));
                if (!result)
                  return reject(new Error('Empty result from Cloudinary'));
                resolve(result);
              },
            );
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
          },
        );
        proofUrl = uploadResult.secure_url;
      } catch (error) {
        this.logger.error('Cloudinary Proof Upload Failed', error);
        throw new BadRequestException(
          'Failed to upload proof of work screenshot.',
        );
      }
    }

    const updatedApplication = await this.prisma.$transaction(
      async (prisma) => {
        const updatedApp = await prisma.application.update({
          where: { id: applicationId },
          data: { stage: dto.stage },
        });

        await prisma.proofOfWork.create({
          data: {
            applicationId: applicationId,
            staffId: staffId,
            stageMovedTo: dto.stage,
            fileUrl: proofUrl,
            notes: `${dto.title}: ${dto.description}`,
          },
        });

        return updatedApp;
      },
    );

    await this.syncStageTasks(applicationId, dto.stage);

    if (application.lead && application.lead.email) {
      const studentName = application.lead.firstName || 'Student';
      const formattedStage = dto.stage.replace(/_/g, ' ');

      const emailSubject = `Application Update: Advanced to ${formattedStage}`;
      const emailHtml = `
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>Great news! Your university application has officially progressed to the next stage: <strong>${formattedStage}</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid #0fa3b1; margin: 16px 0;">
          <p style="margin-top: 0;"><strong>Update Details:</strong></p>
          <p style="margin-bottom: 0; color: #334155;">${dto.title}: ${dto.description}</p>
        </div>

        <p>You can view the official document/evidence for this update by clicking the secure link below:</p>
        <a href="${proofUrl}" target="_blank" style="display:inline-block; margin: 10px 0; padding: 10px 20px; background-color: #0fa3b1; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
          View Uploaded Document
        </a>
        
        <p style="margin-top: 20px;">If you have any questions, please reply to this email.</p>
      `;

      const replyToAddress = `reply+${application.lead.id}@replies.ronaldpartners.com`;

      await this.emailService.sendStudentEmail(
        application.lead.email,
        emailSubject,
        emailHtml,
        replyToAddress,
      );

      this.logger.log(
        `Proof of work email dispatched to ${application.lead.email}`,
      );
    }

    this.logger.log(
      `Proof of work logged for application ${applicationId}. Advanced to ${dto.stage}`,
    );

    return {
      success: true,
      message: 'Proof of work submitted and application advanced successfully.',
      data: updatedApplication,
      proofUrl,
    };
  }

  async toggleTaskStatus(taskId: string, isCompleted: boolean) {
    const task = await this.prisma.applicationTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    return this.prisma.applicationTask.update({
      where: { id: taskId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });
  }

  async getProofsOfWork(applicationId: string) {
    const proofs = await this.prisma.proofOfWork.findMany({
      where: { applicationId },
      include: {
        staff: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: proofs,
    };
  }
}
