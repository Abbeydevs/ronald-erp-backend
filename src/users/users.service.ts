import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDetailsDto } from './dto/update-user-details.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers(role?: Role) {
    this.logger.log(`Fetching users${role ? ` with role: ${role}` : ''}`);

    const whereClause = role
      ? { role, isActive: true }
      : { role: { not: Role.STUDENT } };

    return this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        workMode: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        branch: true,
        assignedLeads: {
          where: { status: { not: 'LOST' } },
          select: { id: true, firstName: true, lastName: true, status: true },
        },
        deviceFingerprints: true,
        attendances: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        dailyReports: {
          orderBy: { submittedAt: 'desc' },
          take: 30,
        },
        idleAlerts: {
          orderBy: { lockedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) throw new NotFoundException('Staff member not found.');
    return user;
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Staff member not found.');

    return this.prisma.$transaction(async (prisma) => {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: dto.isActive },
      });

      if (!dto.isActive && dto.reassignToId) {
        await prisma.lead.updateMany({
          where: { assignedToId: id },
          data: { assignedToId: dto.reassignToId },
        });

        await prisma.application.updateMany({
          where: { counsellorId: id },
          data: { counsellorId: dto.reassignToId },
        });

        this.logger.log(
          `Reassigned workload from ${id} to ${dto.reassignToId}`,
        );
      }

      this.logger.log(`User ${id} status changed to isActive: ${dto.isActive}`);
      return updatedUser;
    });
  }

  async updateUserDetails(id: string, dto: UpdateUserDetailsDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Staff member not found.');

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        role: dto.role,
        workMode: dto.workMode,
        branchId: dto.branchId,
      },
    });

    this.logger.log(`Updated details for user ${id}`);
    return updatedUser;
  }

  async clearDeviceFingerprints(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Staff member not found.');

    await this.prisma.deviceFingerprint.deleteMany({
      where: { userId: id },
    });

    this.logger.log(`Cleared device fingerprints for user ${id}`);
    return {
      success: true,
      message: 'Device fingerprints cleared successfully.',
    };
  }
}
