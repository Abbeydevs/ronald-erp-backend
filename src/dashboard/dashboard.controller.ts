import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getDashboardOverview(@Req() req: RequestWithUser) {
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === Role.SUPER_ADMIN || userRole === Role.COMPLIANCE_HR) {
      const data = await this.dashboardService.getAdminDashboard();
      return { success: true, type: 'ADMIN', data };
    }

    const data = await this.dashboardService.getStaffDashboard(userId);
    return { success: true, type: 'STAFF', data };
  }
}
