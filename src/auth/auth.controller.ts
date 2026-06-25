import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from './guards/roles.guard';
import { Role } from '@prisma/client';
import * as express from 'express';

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
}
