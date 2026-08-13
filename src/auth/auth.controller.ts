import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from './guards/roles.guard';
import { Role } from '@prisma/client';
import * as express from 'express';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';

interface AuthenticatedRequest extends express.Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('invite/generate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async generateInvite(
    @Body() createInviteDto: CreateInviteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const adminId = req.user.id;
    return this.authService.generateInvitation(createInviteDto, adminId);
  }

  @Post('register')
  async register(
    @Body() registerStaffDto: RegisterStaffDto,
    @Req() req: express.Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.registerStaff(
      registerStaffDto,
      ipAddress,
      userAgent,
    );
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: express.Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('register-student')
  async registerStudent(
    @Body() registerStudentDto: RegisterStudentDto,
    @Req() req: express.Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.registerStudent(
      registerStudentDto,
      ipAddress,
      userAgent,
    );
  }
}
