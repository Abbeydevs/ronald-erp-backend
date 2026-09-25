import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CalculateCommissionDto,
  UpdateCommissionStatusDto,
} from './dto/commission.dto';
import { CommissionStatus } from '@prisma/client';

@Injectable()
export class CommissionsService {
  constructor(private prisma: PrismaService) {}

  async calculateCommission(
    targetSchoolId: string,
    dto: CalculateCommissionDto,
  ) {
    const targetSchool = await this.prisma.targetSchool.findUnique({
      where: { id: targetSchoolId },
      include: { institution: true, lead: true },
    });

    if (!targetSchool) {
      throw new NotFoundException('Target school record not found');
    }

    // Fallback to the institution's default agent percentage if no custom one is provided
    const agentPct =
      dto.customAgentPercentage ??
      targetSchool.institution?.agentCommissionPercentage ??
      0;

    // 1. Calculate Agent's cut based on the flat amount the school pays
    const agentCommissionAmount = (dto.schoolCommissionAmount * agentPct) / 100;

    // 2. Calculate Admin's net revenue (Total from school minus the agent's cut)
    // Note: If you want rpCommissionAmount to represent the GROSS amount instead,
    // simply change this to: const rpCommissionAmount = dto.schoolCommissionAmount;
    const rpCommissionAmount =
      dto.schoolCommissionAmount - agentCommissionAmount;

    return this.prisma.targetSchool.update({
      where: { id: targetSchoolId },
      data: {
        rpCommissionAmount,
        agentCommissionAmount,
        commissionStatus: CommissionStatus.CALCULATED,
      },
    });
  }

  async updateStatus(targetSchoolId: string, dto: UpdateCommissionStatusDto) {
    const targetSchool = await this.prisma.targetSchool.findUnique({
      where: { id: targetSchoolId },
    });

    if (!targetSchool) {
      throw new NotFoundException('Target school record not found');
    }

    return this.prisma.targetSchool.update({
      where: { id: targetSchoolId },
      data: {
        commissionStatus: dto.status,
      },
    });
  }

  async getPendingPayouts() {
    return this.prisma.targetSchool.findMany({
      where: {
        commissionStatus: {
          in: [CommissionStatus.CALCULATED, CommissionStatus.APPROVED],
        },
        agentCommissionAmount: { gt: 0 },
      },
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            referredBy: { select: { name: true, email: true } },
          },
        },
        institution: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
