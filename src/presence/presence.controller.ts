import { Controller, Get, UseGuards } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('hr/logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get('idle-alerts')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async getIdleAlerts() {
    const alerts = await this.presenceService.getIdleAlerts();
    return {
      success: true,
      message: 'Idle alerts retrieved successfully.',
      data: alerts,
    };
  }
}
