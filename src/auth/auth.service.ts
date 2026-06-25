import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async generateInvitation(dto: CreateInviteDto, adminId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('A user with this email already exists.');
    }

    await this.prisma.invitation.deleteMany({
      where: { email: dto.email, isUsed: false },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        role: dto.role,
        token: rawToken,
        expiresAt,
        generatedById: adminId,
      },
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const frontendRegistrationUrl = `${frontendBaseUrl}/register?token=${invitation.token}`;

    return {
      message: 'Invitation generated successfully.',
      expiresAt: invitation.expiresAt,
      inviteUrl: frontendRegistrationUrl,
    };
  }
}
