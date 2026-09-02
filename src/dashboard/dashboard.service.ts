import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus, LeadPriority } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminDashboard() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalLeads, unassignedLeads, hotLeads] = await Promise.all([
      this.prisma.lead.count({ where: { studentId: null } }),
      this.prisma.lead.count({
        where: { status: LeadStatus.UNASSIGNED, studentId: null },
      }),
      this.prisma.lead.count({
        where: { priority: LeadPriority.HOT, studentId: null },
      }),
    ]);

    const activeStaffCount = await this.prisma.attendance.count({
      where: {
        date: { gte: todayStart },
        clockOut: null,
      },
    });

    const pendingRemindersCount = await this.prisma.reminder.count({
      where: { isRead: false },
    });

    const allReminders = await this.prisma.reminder.findMany({
      where: { isRead: false },
      orderBy: { dueDate: 'asc' },
      take: 10,
      include: {
        user: { select: { name: true } },
        application: {
          include: { lead: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    return {
      metrics: {
        totalLeads,
        unassignedLeads,
        hotLeads,
        activeStaffCount,
        pendingReminders: pendingRemindersCount,
      },
      reminders: allReminders,
    };
  }

  async getStaffDashboard(userId: string) {
    const [myTotalLeads, myHotLeads] = await Promise.all([
      this.prisma.lead.count({
        where: { assignedToId: userId, studentId: null },
      }),
      this.prisma.lead.count({
        where: {
          assignedToId: userId,
          priority: LeadPriority.HOT,
          studentId: null,
        },
      }),
    ]);

    const myReminders = await this.prisma.reminder.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      include: {
        application: {
          include: { lead: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    return {
      metrics: {
        myTotalLeads,
        myHotLeads,
      },
      reminders: myReminders,
    };
  }
}
