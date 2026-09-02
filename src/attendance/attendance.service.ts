import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClockInDto } from './dto/clock-in.dto';
import { Cron } from '@nestjs/schedule';
import { DayOfWeek } from '@prisma/client';
import * as crypto from 'crypto';
import { WorkMode, Role } from '@prisma/client';

export type AttendanceStatus =
  | 'ON_TIME'
  | 'LATE'
  | 'WORKING_REMOTELY'
  | 'PENDING'
  | 'LATE_NOT_CLOCKED_IN'
  | 'ABSENT';

export interface LiveAttendanceRecord {
  attendanceId: string;
  userId: string;
  userName: string;
  role: Role;
  branchName: string;
  clockInTime: Date;
  status: AttendanceStatus;
}

export interface ComprehensiveAttendanceRecord {
  userId: string;
  userName: string;
  role: Role;
  branchName: string;
  workMode: WorkMode;
  date: string;
  clockInTime: Date | null;
  clockOutTime: Date | null;
  status: AttendanceStatus;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  private readonly qrSecret =
    process.env.JWT_SECRET || 'rp-secure-qr-fallback-key';

  constructor(private readonly prisma: PrismaService) {}

  async clockIn(userId: string, dto: ClockInDto) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const activeShift = await this.prisma.attendance.findFirst({
      where: {
        userId,
        date: { gte: startOfDay },
        clockOut: null,
      },
    });

    if (activeShift) {
      throw new BadRequestException(
        'You already have an active shift. Please clock out first.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { branch: true },
    });

    if (!user) throw new BadRequestException('User not found.');

    let requiresGps = true;
    let isOvertime = false;

    if (user.branch && this.isAfterClosingTime(user.branch.closingTime)) {
      isOvertime = true;
      requiresGps = false;
    } else {
      if (user.workMode === 'REMOTE') {
        requiresGps = false;
      } else if (user.workMode === 'HYBRID') {
        const watDate = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
        );
        const dayNames = [
          'SUNDAY',
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
          'FRIDAY',
          'SATURDAY',
        ];
        const today = dayNames[watDate.getDay()] as DayOfWeek;

        if (user.remoteDays.includes(today)) {
          requiresGps = false;
        }
      }
    }

    if (requiresGps) {
      if (!dto.latitude || !dto.longitude) {
        throw new BadRequestException('LOCATION_REQUIRED');
      }

      const branch = user.branch;
      if (!branch) {
        throw new BadRequestException(
          'Configuration Error: No office branch assigned.',
        );
      }

      const distance = this.calculateDistance(
        dto.latitude,
        dto.longitude,
        branch.latitude,
        branch.longitude,
      );

      if (distance > branch.radiusMeters) {
        throw new BadRequestException(
          `OUT_OF_BOUNDS|${Math.round(distance)}|${branch.radiusMeters}`,
        );
      }
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        userId,
        branchId: requiresGps ? user.branch?.id : null,
        date: new Date(),
        clockInLat: dto.latitude || null,
        clockInLng: dto.longitude || null,
        isOvertime,
      },
    });

    this.logger.log(
      `User ${userId} clocked in successfully. Overtime: ${isOvertime}. Requires GPS: ${requiresGps}`,
    );
    return attendance;
  }

  generateQrToken(userId: string): string {
    const timestamp = Date.now();
    const payload = `${userId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', this.qrSecret);
    hmac.update(payload);
    return `${payload}:${hmac.digest('hex')}`;
  }

  verifyQrToken(token: string): string | null {
    try {
      const [userId, timestamp, hash] = token.split(':');
      if (!userId || !timestamp || !hash) return null;

      if (Date.now() - parseInt(timestamp, 10) > 5 * 60 * 1000) {
        return null;
      }

      const hmac = crypto.createHmac('sha256', this.qrSecret);
      hmac.update(`${userId}:${timestamp}`);

      if (hmac.digest('hex') !== hash) return null;

      return userId;
    } catch (error) {
      this.logger.error('Error verifying QR token', error);
      return null;
    }
  }

  async qrClockIn(token: string, dto: ClockInDto) {
    const userId = this.verifyQrToken(token);
    if (!userId) {
      throw new UnauthorizedException(
        'QR Code is invalid or has expired. Please refresh your desktop screen.',
      );
    }

    return this.clockIn(userId, dto);
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

  private isAfterClosingTime(closingTime: string): boolean {
    const now = new Date();
    const [hours, minutes] = closingTime.split(':').map(Number);
    const closingDate = new Date();
    closingDate.setHours(hours, minutes, 0, 0);
    return now > closingDate;
  }

  async getTodayStatus(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendance.findFirst({
      where: {
        userId,
        date: { gte: startOfDay },
        clockOut: null,
      },
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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendance.findFirst({
      where: {
        userId,
        date: { gte: startOfDay },
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('No active shift found to clock out of.');
    }

    return this.prisma.attendance.update({
      where: { id: record.id },
      data: { clockOut: new Date() },
    });
  }

  @Cron('0 18 * * *', { timeZone: 'Africa/Lagos' })
  async handleEveningSweep() {
    this.logger.log('Executing 6:00 PM Work-Life Balance Sweep...');
    try {
      const result = await this.prisma.attendance.updateMany({
        where: { clockOut: null, isOvertime: false },
        data: { clockOut: new Date(), isAutoClosed: true },
      });
      this.logger.log(`Auto-closed ${result.count} standard shifts.`);
    } catch (error) {
      this.logger.error('Failed to execute evening sweep', error);
    }
  }

  @Cron('0 0 * * *', { timeZone: 'Africa/Lagos' })
  async handleMidnightSweep() {
    this.logger.log('Executing 12:00 AM Midnight Sweep...');
    try {
      const result = await this.prisma.attendance.updateMany({
        where: { clockOut: null },
        data: { clockOut: new Date(), isAutoClosed: true },
      });
      this.logger.log(`Auto-closed ${result.count} overtime shifts.`);
    } catch (error) {
      this.logger.error('Failed to execute midnight sweep', error);
    }
  }

  private isRemoteDay(remoteDays: DayOfWeek[]): boolean {
    const watDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
    );
    const dayNames: DayOfWeek[] = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    const today = dayNames[watDate.getDay()];
    return remoteDays.includes(today);
  }

  private calculateStatus(
    clockInTime: Date | null,
    branchOpeningTime: string,
    branchClosingTime: string,
    workMode: WorkMode,
    remoteDays: DayOfWeek[],
  ): AttendanceStatus {
    if (
      workMode === WorkMode.REMOTE ||
      (workMode === WorkMode.HYBRID && this.isRemoteDay(remoteDays))
    ) {
      return 'WORKING_REMOTELY';
    }

    const watNowString = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Lagos',
    });
    const watNow = new Date(watNowString);
    const currentHour = watNow.getHours();
    const currentMinute = watNow.getMinutes();

    const [openHour, openMinute] = branchOpeningTime.split(':').map(Number);
    const [closeHour, closeMinute] = branchClosingTime.split(':').map(Number);

    if (clockInTime) {
      const clockInWat = new Date(
        clockInTime.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
      );
      const inHour = clockInWat.getHours();
      const inMinute = clockInWat.getMinutes();

      if (
        inHour < openHour ||
        (inHour === openHour && inMinute <= openMinute)
      ) {
        return 'ON_TIME';
      }
      return 'LATE';
    }

    const isPastOpening =
      currentHour > openHour ||
      (currentHour === openHour && currentMinute > openMinute);
    const isPastClosing =
      currentHour > closeHour ||
      (currentHour === closeHour && currentMinute >= closeMinute);

    if (isPastClosing) return 'ABSENT';
    if (isPastOpening) return 'LATE_NOT_CLOCKED_IN';

    return 'PENDING';
  }

  async getLiveAttendance(): Promise<LiveAttendanceRecord[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: { date: { gte: todayStart } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            workMode: true,
            remoteDays: true,
          },
        },
        branch: true,
      },
      orderBy: { clockIn: 'desc' },
    });

    return attendances.map((record) => {
      const openingTime = record.branch?.openingTime || '09:00';
      const closingTime = record.branch?.closingTime || '17:00';
      const branchName = record.branch?.name || 'Unassigned';

      const status = this.calculateStatus(
        record.clockIn,
        openingTime,
        closingTime,
        record.user.workMode,
        record.user.remoteDays,
      );

      return {
        attendanceId: record.id,
        userId: record.user.id,
        userName: record.user.name,
        role: record.user.role,
        branchName,
        clockInTime: record.clockIn,
        status,
      };
    });
  }

  async getComprehensiveAttendance(
    dateString: string,
  ): Promise<ComprehensiveAttendanceRecord[]> {
    const queryDate = new Date(dateString);
    queryDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const allStaff = await this.prisma.user.findMany({
      where: { isActive: true, role: { not: Role.STUDENT } },
      include: { branch: true },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: {
        date: {
          gte: queryDate,
          lt: nextDay,
        },
      },
    });

    return allStaff.map((staff) => {
      const record = attendances.find((a) => a.userId === staff.id);

      const openingTime = staff.branch?.openingTime || '09:00';
      const closingTime = staff.branch?.closingTime || '17:00';
      const branchName = staff.branch?.name || 'Unassigned';

      let status: AttendanceStatus;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (!record && queryDate < todayStart) {
        if (
          staff.workMode === WorkMode.REMOTE ||
          (staff.workMode === WorkMode.HYBRID &&
            this.isRemoteDay(staff.remoteDays))
        ) {
          status = 'WORKING_REMOTELY';
        } else {
          status = 'ABSENT';
        }
      } else {
        status = this.calculateStatus(
          record ? record.clockIn : null,
          openingTime,
          closingTime,
          staff.workMode,
          staff.remoteDays,
        );
      }

      return {
        userId: staff.id,
        userName: staff.name,
        role: staff.role,
        branchName,
        workMode: staff.workMode,
        date: dateString,
        clockInTime: record ? record.clockIn : null,
        clockOutTime: record ? record.clockOut : null,
        status,
      };
    });
  }
}
