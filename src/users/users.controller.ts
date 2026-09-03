import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Patch,
  Body,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDetailsDto } from './dto/update-user-details.dto';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async getUsers(@Query('role') role?: Role) {
    return this.usersService.findAllUsers(role);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(id, dto);
  }

  @Patch(':id/details')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async updateUserDetails(
    @Param('id') id: string,
    @Body() dto: UpdateUserDetailsDto,
  ) {
    return this.usersService.updateUserDetails(id, dto);
  }

  @Post(':id/clear-fingerprint')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async clearFingerprints(@Param('id') id: string) {
    return this.usersService.clearDeviceFingerprints(id);
  }
}
