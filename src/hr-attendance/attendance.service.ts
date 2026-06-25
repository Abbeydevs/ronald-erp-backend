import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkMode, DayOfWeek } from '@prisma/client';
import { ClockInDto } from './dto/clock-in.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async clockIn(userId: string, dto: ClockInDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { branch: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

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

    let isOvertime = false;
    let requiresGeofence = false;

    if (user.branch && this.isAfterClosingTime(user.branch.closingTime)) {
      isOvertime = true;
      requiresGeofence = false;
    } else {
      if (user.workMode === WorkMode.ONSITE) {
        requiresGeofence = true;
      } else if (user.workMode === WorkMode.HYBRID) {
        const todayEnum = this.getCurrentDayEnum();
        const isRemoteDay = user.remoteDays.includes(todayEnum);
        requiresGeofence = !isRemoteDay;
      } else if (user.workMode === WorkMode.REMOTE) {
        requiresGeofence = false;
      }
    }

    if (requiresGeofence) {
      if (!user.branch) {
        throw new ForbiddenException(
          'You are required to be onsite, but no branch is assigned to your profile.',
        );
      }
      if (dto.latitude === undefined || dto.longitude === undefined) {
        throw new ForbiddenException(
          'GPS coordinates are required for onsite clock-in.',
        );
      }

      const distanceInMeters = this.calculateHaversineDistance(
        dto.latitude,
        dto.longitude,
        user.branch.latitude,
        user.branch.longitude,
      );

      if (distanceInMeters > user.branch.radiusMeters) {
        throw new ForbiddenException(
          `Geofence restriction: You are ${Math.round(distanceInMeters)} meters away from the branch. You must be within ${user.branch.radiusMeters} meters to clock in.`,
        );
      }
    }

    const newAttendance = await this.prisma.attendance.create({
      data: {
        userId: user.id,
        branchId: user.branchId,
        date: new Date(),
        clockInLat: dto.latitude,
        clockInLng: dto.longitude,
        isOvertime,
      },
    });

    return {
      success: true,
      message: isOvertime
        ? 'Overtime shift started. Geofence bypassed.'
        : 'Clock-in successful.',
      data: newAttendance,
    };
  }

  async clockOut(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const activeShift = await this.prisma.attendance.findFirst({
      where: {
        userId,
        date: { gte: startOfDay },
        clockOut: null,
      },
    });

    if (!activeShift) {
      throw new BadRequestException(
        'You do not have an active shift to clock out of.',
      );
    }

    const closedShift = await this.prisma.attendance.update({
      where: { id: activeShift.id },
      data: {
        clockOut: new Date(),
      },
    });

    return {
      success: true,
      message: 'Clock-out successful. Have a great day!',
      data: closedShift,
    };
  }

  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3;
    const toRadians = (deg: number) => (deg * Math.PI) / 180;

    const phi1 = toRadians(lat1);
    const phi2 = toRadians(lat2);
    const deltaPhi = toRadians(lat2 - lat1);
    const deltaLambda = toRadians(lon2 - lon1);

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

  private getCurrentDayEnum(): DayOfWeek {
    const days: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return days[new Date().getDay()];
  }
}
