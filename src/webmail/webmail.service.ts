import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendEmailDto, SaveDraftDto } from './dto/webmail.dto';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';

export interface EmailHeader {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: Date;
}

@Injectable()
export class WebmailService {
  private readonly logger = new Logger(WebmailService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey =
    process.env.EMAIL_ENCRYPTION_KEY || 'RonaldPartnersERPSecretKey2026!!';

  constructor(private readonly prisma: PrismaService) {}

  private decryptPassword(encryptedData: string): string {
    try {
      const [ivHex, encryptedHex] = encryptedData.split(':');
      if (!ivHex || !encryptedHex) throw new Error('Invalid format');

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(this.secretKey),
        iv,
      );
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt email password', error);
      throw new UnauthorizedException(
        'Invalid email credentials configuration.',
      );
    }
  }

  private async getHostingerCredentials(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (
      !user ||
      !user.isEmailConnected ||
      !user.emailPassword ||
      !user.integratedEmail
    ) {
      throw new UnauthorizedException('Email is not connected.');
    }

    const password = this.decryptPassword(user.emailPassword);
    return {
      email: user.integratedEmail,
      password,
      signature: user.emailSignature || '',
    };
  }

  async sendEmail(userId: string, dto: SendEmailDto) {
    const creds = await this.getHostingerCredentials(userId);

    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: creds.email,
        pass: creds.password,
      },
    });

    const finalHtml = dto.body
      ? `${dto.body}<br/><br/>${creds.signature}`
      : creds.signature;

    try {
      await transporter.sendMail({
        from: creds.email,
        to: dto.to,
        subject: dto.subject || 'No Subject',
        html: finalHtml,
      });

      this.logger.log(`Email sent by ${userId} to ${dto.to}`);

      if (dto.draftId) {
        await this.prisma.emailDraft.deleteMany({
          where: { id: dto.draftId, userId },
        });
      }

      return { success: true, message: 'Email sent successfully.' };
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw new InternalServerErrorException(
        'Failed to send email via Hostinger.',
      );
    }
  }

  async getEmailsFromFolder(
    userId: string,
    folderName: string,
  ): Promise<EmailHeader[]> {
    const creds = await this.getHostingerCredentials(userId);

    const client = new ImapFlow({
      host: 'imap.hostinger.com',
      port: 993,
      secure: true,
      auth: { user: creds.email, pass: creds.password },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock(folderName);

      try {
        const status = await client.status(folderName, { messages: true });
        const total = status.messages || 0;

        if (total === 0) return [];

        const fetchRange = `${Math.max(1, total - 49)}:*`;
        const emails: EmailHeader[] = [];

        for await (const message of client.fetch(fetchRange, {
          envelope: true,
          uid: true,
        })) {
          emails.push({
            uid: message.uid,
            subject: message.envelope?.subject || 'No Subject',
            from: message.envelope?.from?.[0]?.address || 'Unknown',
            to: message.envelope?.to?.[0]?.address || 'Unknown',
            date: message.envelope?.date || new Date(),
          });
        }

        return emails.sort((a, b) => b.uid - a.uid);
      } finally {
        lock.release();
      }
    } catch (error) {
      this.logger.error(`Failed to fetch IMAP folder: ${folderName}`, error);
      throw new InternalServerErrorException(
        `Could not read ${folderName} folder.`,
      );
    } finally {
      await client.logout();
    }
  }

  async saveDraft(userId: string, dto: SaveDraftDto) {
    const draft = await this.prisma.emailDraft.create({
      data: {
        userId,
        to: dto.to || '',
        subject: dto.subject || '',
        body: dto.body || '',
      },
    });
    return { success: true, message: 'Draft saved.', data: draft };
  }

  async getDrafts(userId: string) {
    return this.prisma.emailDraft.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async deleteDraft(userId: string, draftId: string) {
    const draft = await this.prisma.emailDraft.findFirst({
      where: { id: draftId, userId },
    });

    if (!draft) throw new NotFoundException('Draft not found.');

    await this.prisma.emailDraft.delete({ where: { id: draftId } });
    return { success: true, message: 'Draft deleted.' };
  }
}
