import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, dto: CreateReminderDto) {
    const reminder = await this.prisma.reminder.create({
      data: {
        note: dto.note,
        dueDate: new Date(dto.dueDate),
        userId: userId,
        applicationId: dto.applicationId || null,
        stage: dto.stage || null,
        isRead: false,
        isEmailed: false,
      },
    });

    this.logger.log(
      `Reminder created for staff ${userId} scheduled at ${dto.dueDate}`,
    );
    return reminder;
  }

  async getMyReminders(userId: string) {
    return this.prisma.reminder.findMany({
      where: { userId },
      orderBy: [{ isRead: 'asc' }, { dueDate: 'asc' }],
      include: {
        application: {
          include: {
            lead: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.reminder.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingReminders() {
    const now = new Date();

    const dueReminders = await this.prisma.reminder.findMany({
      where: {
        dueDate: {
          lte: now,
        },
        isRead: false,
        isEmailed: false,
      },
      include: {
        user: true,
        application: {
          include: {
            lead: true,
          },
        },
      },
    });

    if (dueReminders.length === 0) {
      return;
    }

    this.logger.log(
      `Found ${dueReminders.length} reminders due right now. Dispatching emails...`,
    );

    for (const reminder of dueReminders) {
      const studentName = reminder.application?.lead
        ? `${reminder.application.lead.firstName} ${reminder.application.lead.lastName}`
        : 'General Task';

      const emailSent = await this.emailService.sendReminderEmail(
        reminder.user.name,
        reminder.user.email,
        reminder.note,
        studentName,
        reminder.stage || undefined,
      );

      if (emailSent) {
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { isEmailed: true },
        });
      }
    }
  }
}
