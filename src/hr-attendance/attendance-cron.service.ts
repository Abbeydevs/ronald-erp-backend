import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AttendanceCronService {
  private readonly logger = new Logger(AttendanceCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 18 * * *', {
    timeZone: 'Africa/Lagos',
  })
  async handleEveningSweep() {
    this.logger.log('Executing 6:00 PM Work-Life Balance Sweep...');

    const updated = await this.prisma.attendance.updateMany({
      where: {
        clockOut: null,
        isOvertime: false,
      },
      data: {
        clockOut: new Date(),
        isAutoClosed: true,
      },
    });

    this.logger.log(`Auto-closed ${updated.count} standard shifts.`);
  }

  @Cron('0 0 * * *', {
    timeZone: 'Africa/Lagos',
  })
  async handleMidnightSweep() {
    this.logger.log('Executing 12:00 AM Midnight Sweep...');

    const updated = await this.prisma.attendance.updateMany({
      where: {
        clockOut: null,
      },
      data: {
        clockOut: new Date(),
        isAutoClosed: true,
      },
    });

    this.logger.log(`Auto-closed ${updated.count} overtime shifts.`);
  }
}
