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

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBoardApplications(user: { id: string; role: Role }) {
    const whereClause: Prisma.ApplicationWhereInput = {};

    if (user.role === Role.ADMISSIONS_COUNSELLOR) {
      whereClause.counsellorId = user.id;
    } else if (user.role === Role.FINANCE_OFFICER) {
      whereClause.OR = [
        { financeId: user.id },
        {
          stage: {
            in: [
              ApplicationStage.FINANCE_INVOICING,
              ApplicationStage.FINANCE_VERIFYING,
            ],
          },
        },
      ];
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
}
