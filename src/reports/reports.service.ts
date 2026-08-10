import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitDailyReport(userId: string, content: string) {
    const todayString = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
    }).format(new Date());

    const existing = await this.prisma.dailyReport.findUnique({
      where: { userId_date: { userId, date: todayString } },
    });

    if (existing) {
      throw new BadRequestException('Report already submitted for today.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { branch: true },
    });

    let isLate = false;

    if (user?.branch?.closingTime) {
      const nowWAT = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
      );
      const [closeHour, closeMinute] = user.branch.closingTime
        .split(':')
        .map(Number);
      const currentHour = nowWAT.getHours();
      const currentMinute = nowWAT.getMinutes();

      if (
        currentHour > closeHour ||
        (currentHour === closeHour && currentMinute > closeMinute)
      ) {
        isLate = true;
      }
    }

    return this.prisma.dailyReport.create({
      data: {
        userId,
        date: todayString,
        content,
        isLate,
      },
    });
  }

  async checkReportStatus(userId: string) {
    const todayString = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
    }).format(new Date());

    const todayReport = await this.prisma.dailyReport.findUnique({
      where: { userId_date: { userId, date: todayString } },
    });

    const yesterdayDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
    );
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayString = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
    }).format(yesterdayDate);

    const startOfYesterday = new Date(`${yesterdayString}T00:00:00.000Z`);
    const endOfYesterday = new Date(`${yesterdayString}T23:59:59.999Z`);

    const hadShiftYesterday = await this.prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: startOfYesterday,
          lte: endOfYesterday,
        },
      },
    });

    const yesterdayReport = await this.prisma.dailyReport.findUnique({
      where: { userId_date: { userId, date: yesterdayString } },
    });

    return {
      hasSubmittedToday: !!todayReport,
      missingYesterdayReport: !!(hadShiftYesterday && !yesterdayReport),
      yesterdayDate: yesterdayString,
    };
  }

  async getAllReportsForAdmin() {
    return this.prisma.dailyReport.findMany({
      orderBy: {
        submittedAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            branch: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }
}
