import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CreateInviteDto } from './dto/create-invite.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { LoginDto } from './dto/login.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async generateInvitation(dto: CreateInviteDto, adminId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser)
      throw new BadRequestException('A user with this email already exists.');

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
    return {
      message: 'Invitation generated successfully.',
      expiresAt: invitation.expiresAt,
      inviteUrl: `${frontendBaseUrl}/register?token=${invitation.token}`,
    };
  }

  async registerStaff(
    dto: RegisterStaffDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invitation) throw new BadRequestException('Invalid invitation token.');
    if (invitation.isUsed)
      throw new BadRequestException('This invitation has already been used.');
    if (invitation.expiresAt < new Date())
      throw new BadRequestException('This invitation has expired.');
    if (invitation.email !== dto.email)
      throw new BadRequestException('Email does not match the invitation.');

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    await this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          hash: hashedPassword,
          role: invitation.role,
          deviceFingerprints: {
            create: {
              fingerprintHash: dto.fingerprintHash,
              ipAddress,
              userAgent,
            },
          },
        },
      });

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { isUsed: true },
      });

      return user;
    });

    return { message: 'Staff registration successful. You can now log in.' };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { deviceFingerprints: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Invalid credentials or inactive account.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const existingDevice = user.deviceFingerprints.find(
      (df) => df.fingerprintHash === dto.fingerprintHash,
    );

    if (!existingDevice) {
      await this.prisma.deviceFingerprint.create({
        data: {
          userId: user.id,
          fingerprintHash: dto.fingerprintHash,
          ipAddress,
          userAgent,
        },
      });
    } else {
      await this.prisma.deviceFingerprint.update({
        where: { id: existingDevice.id },
        data: { lastSeen: new Date(), ipAddress, userAgent },
      });
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
