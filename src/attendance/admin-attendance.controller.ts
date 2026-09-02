import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { AttendanceService } from './attendance.service';

@Controller('attendance/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
export class AdminAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('live')
  async getLiveAttendance() {
    const data = await this.attendanceService.getLiveAttendance();
    return { success: true, data };
  }

  @Get('history')
  async getComprehensiveAttendance(@Query('date') date: string) {
    let queryDate = date;
    if (!queryDate || queryDate === 'undefined' || queryDate === 'null') {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      queryDate = `${y}-${m}-${d}`;
    }

    const data =
      await this.attendanceService.getComprehensiveAttendance(queryDate);
    return { success: true, data };
  }
}
