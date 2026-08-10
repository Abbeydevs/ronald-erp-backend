import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ReportsService } from './reports.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  };
}

@Controller('staff/reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('submit')
  async submitReport(
    @Req() req: AuthenticatedRequest,
    @Body('content') content: string,
  ) {
    const userId = req.user.id;
    const report = await this.reportsService.submitDailyReport(userId, content);

    return {
      success: true,
      message: 'Daily report submitted successfully.',
      data: report,
    };
  }

  @Get('status')
  async checkStatus(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const status = await this.reportsService.checkReportStatus(userId);

    return {
      success: true,
      data: status,
    };
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async getAllReportsForAdmin() {
    const reports = await this.reportsService.getAllReportsForAdmin();

    return {
      success: true,
      data: reports,
    };
  }
}
