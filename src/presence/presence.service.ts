import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async handleIdleThresholdBreach(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) return;

      await this.prisma.idleAlert.create({
        data: {
          userId,
        },
      });

      await this.emailService.sendIdleAlertEmail(user.name, user.email);

      this.logger.log(
        `Idle session locked and HR notified for user: ${user.name}`,
      );
    } catch (error) {
      this.logger.error('Failed to process idle threshold breach', error);
    }
  }

  async getIdleAlerts() {
    return this.prisma.idleAlert.findMany({
      include: {
        user: {
          select: { name: true, email: true, role: true, branchId: true },
        },
      },
      orderBy: {
        lockedAt: 'desc',
      },
    });
  }
}
