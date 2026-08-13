import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentType, DocumentStatus, ApplicationStage } from '@prisma/client';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);

  constructor(private readonly prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async getStudentVault(studentId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { studentId: studentId },
      include: {
        applications: {
          include: {
            documents: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Student profile not found.');
    }

    const activeApplication = lead.applications[0];

    if (!activeApplication) {
      return {
        hasApplication: false,
        documents: [],
      };
    }

    return {
      hasApplication: true,
      applicationId: activeApplication.id,
      stage: activeApplication.stage,
      documents: activeApplication.documents,
    };
  }

  async uploadStudentDocument(
    studentId: string,
    applicationId: string,
    type: DocumentType,
    file: Express.Multer.File,
  ) {
    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        lead: { studentId: studentId },
      },
    });

    if (!application) {
      throw new NotFoundException(
        'Application not found or unauthorized access.',
      );
    }

    let fileUrl: string;
    try {
      const uploadResult = await new Promise<UploadApiResponse>(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'ronald_crm_vault',
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
      fileUrl = uploadResult.secure_url;
    } catch (error) {
      this.logger.error('Cloudinary Vault Upload Failed', error);
      throw new BadRequestException(
        'Failed to securely process the document upload.',
      );
    }

    const document = await this.prisma.document.create({
      data: {
        applicationId: application.id,
        type,
        fileUrl,
        status: DocumentStatus.PENDING,
      },
    });

    if (application.stage === ApplicationStage.DOCUMENT_GATHERING) {
      await this.prisma.application.update({
        where: { id: application.id },
        data: { stage: ApplicationStage.DOCUMENT_REVIEW },
      });
    }

    this.logger.log(`Student ${studentId} uploaded ${type} to vault.`);
    return document;
  }
}
