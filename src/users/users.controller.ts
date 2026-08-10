import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async getUsersByRole(@Query('role') role?: string) {
    if (!role) {
      throw new BadRequestException('Role query parameter is required');
    }

    if (!Object.values(Role).includes(role as Role)) {
      throw new BadRequestException('Invalid role specified');
    }

    return this.usersService.findByRole(role as Role);
  }
}
