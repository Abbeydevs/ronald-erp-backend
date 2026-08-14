import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClockInDto } from './dto/clock-in.dto';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async clockIn(userId: string, dto: ClockInDto) {
    const activeShift = await this.prisma.attendance.findFirst({
      where: { userId, clockOut: null },
    });

    if (activeShift) {
      throw new BadRequestException(
        'You already have an active shift. Please clock out first.',
      );
    }

    // WAT wall-clock hour, computed without the toLocaleString round-trip
    const currentHour = this.getWATHour();
    const isAfterHours = currentHour >= 17 || currentHour < 9;

    let branchId: string | null = null;

    if (isAfterHours) {
      if (!dto.latitude || !dto.longitude) {
        throw new BadRequestException(
          'Out of Bounds: Location is required during standard office hours.',
        );
      }

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const branch = user?.branchId
        ? await this.prisma.branch.findUnique({ where: { id: user.branchId } })
        : await this.prisma.branch.findFirst();

      if (!branch) {
        throw new BadRequestException(
          'System configuration error: No branch assigned.',
        );
      }

      branchId = branch.id;

      const distance = this.calculateDistance(
        dto.latitude,
        dto.longitude,
        branch.latitude,
        branch.longitude,
      );

      if (distance > branch.radiusMeters) {
        throw new BadRequestException(
          `Out of Bounds: You are ${Math.round(distance)} meters away. You must be within ${branch.radiusMeters} meters to clock in.`,
        );
      }
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        userId,
        branchId,
        date: new Date(), // just for reporting/records — not used for lookups anymore
        clockInLat: isAfterHours ? null : dto.latitude,
        clockInLng: isAfterHours ? null : dto.longitude,
      },
    });

    this.logger.log(
      `User ${userId} clocked in successfully. After hours: ${isAfterHours}`,
    );
    return attendance;
  }

  private getWATHour(): number {
    const WAT_OFFSET_MS = 60 * 60 * 1000;
    const watInstant = new Date(Date.now() + WAT_OFFSET_MS);
    return watInstant.getUTCHours();
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const phi1 = lat1 * rad;
    const phi2 = lat2 * rad;
    const deltaPhi = (lat2 - lat1) * rad;
    const deltaLambda = (lon2 - lon1) * rad;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async getTodayStatus(userId: string) {
    const record = await this.prisma.attendance.findFirst({
      where: { userId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });

    return {
      hasClockedIn: !!record,
      isActiveShift: !!record,
      hasClockedOut: false,
      record,
    };
  }

  async clockOut(userId: string) {
    const record = await this.prisma.attendance.findFirst({
      where: { userId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('No active shift found to clock out of.');
    }

    const updatedRecord = await this.prisma.attendance.update({
      where: { id: record.id },
      data: { clockOut: new Date() },
    });

    return updatedRecord;
  }

  @Cron('0 17,0 * * *', { timeZone: 'Africa/Lagos' })
  async handleAutoClockOut() {
    this.logger.log('Initiating automated shift closer...');

    try {
      const result = await this.prisma.attendance.updateMany({
        where: { clockOut: null },
        data: {
          clockOut: new Date(),
          isAutoClosed: true,
        },
      });

      this.logger.log(
        `Automated shift closer completed. Auto-closed ${result.count} active shifts.`,
      );
    } catch (error) {
      this.logger.error('Failed to execute automated shift closer', error);
    }
  }
}
