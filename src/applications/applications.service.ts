import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStage, Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { UpdateStageDto } from './dto/update-stage.dto';

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
}
