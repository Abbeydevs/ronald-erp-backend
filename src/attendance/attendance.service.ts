import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClockInDto } from './dto/clock-in.dto';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async clockIn(userId: string, dto: ClockInDto) {
    const nowWAT = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
    );
    const currentHour = nowWAT.getHours();

    const startOfDayWAT = new Date(nowWAT);
    startOfDayWAT.setHours(0, 0, 0, 0);

    const activeShift = await this.prisma.attendance.findFirst({
      where: {
        userId,
        clockOut: null,
        date: {
          gte: startOfDayWAT,
        },
      },
    });

    if (activeShift) {
      throw new BadRequestException(
        'You already have an active shift. Please clock out first.',
      );
    }

    const isAfterHours = currentHour >= 17;

    let branchId = null;

    if (!isAfterHours) {
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
        date: nowWAT,
        clockInLat: isAfterHours ? null : dto.latitude,
        clockInLng: isAfterHours ? null : dto.longitude,
      },
    });

    this.logger.log(
      `User ${userId} clocked in successfully. After hours: ${isAfterHours}`,
    );
    return attendance;
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
    const todayStr = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    const record = await this.prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return {
      hasClockedIn: !!record,
      isActiveShift: !!record && !record.clockOut,
      hasClockedOut: !!record?.clockOut,
      record,
    };
  }

  async clockOut(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    const record = await this.prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        clockOut: null,
      },
    });

    if (!record) {
      throw new BadRequestException('No active shift found to clock out of.');
    }

    const updatedRecord = await this.prisma.attendance.update({
      where: { id: record.id },
      data: {
        clockOut: new Date().toISOString(),
      },
    });

    return updatedRecord;
  }

  @Cron('0 17,0 * * *', { timeZone: 'Africa/Lagos' })
  async handleAutoClockOut() {
    this.logger.log('Initiating automated shift closer...');

    const todayStr = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    const currentTime = new Date().toISOString();

    try {
      const result = await this.prisma.attendance.updateMany({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          clockOut: null,
        },
        data: {
          clockOut: currentTime,
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
