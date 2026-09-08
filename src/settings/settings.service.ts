import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectEmailDto, UpdateSignatureDto } from './dto/email-settings.dto';
import * as crypto from 'crypto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey =
    process.env.EMAIL_ENCRYPTION_KEY || 'RonaldPartnersERPSecretKey2026!!';

  constructor(private readonly prisma: PrismaService) {}

  private encryptPassword(password: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        Buffer.from(this.secretKey),
        iv,
      );
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new InternalServerErrorException(
        'Failed to secure email credentials.',
      );
    }
  }

  async connectEmail(userId: string, dto: ConnectEmailDto) {
    const encryptedPassword = this.encryptPassword(dto.appPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isEmailConnected: true,
        integratedEmail: dto.email,
        emailPassword: encryptedPassword,
      },
    });

    this.logger.log(
      `User ${userId} successfully connected their webmail: ${dto.email}`,
    );
    return { success: true, message: 'Email integrated successfully.' };
  }

  async disconnectEmail(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isEmailConnected: false,
        integratedEmail: null,
        emailPassword: null,
      },
    });

    this.logger.log(`User ${userId} disconnected their webmail.`);
    return { success: true, message: 'Email disconnected successfully.' };
  }

  async updateSignature(userId: string, dto: UpdateSignatureDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailSignature: dto.signature,
      },
    });

    return { success: true, message: 'Email signature updated.' };
  }
}
