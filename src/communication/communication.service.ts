import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommType } from '@prisma/client';

export interface SaveCallLogDto {
  leadId: string;
  counsellorId: string;
  duration?: number;
  notes?: string;
}

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveCallLog(dto: SaveCallLogDto, file?: Express.Multer.File) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${dto.leadId} not found`);
    }

    const recordingUrl = file ? `/uploads/recordings/${file.filename}` : null;

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

    this.logger.log(
      `Saved call recording for lead ${dto.leadId} (Log ID: ${log.id})`,
    );
    return log;
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
}
