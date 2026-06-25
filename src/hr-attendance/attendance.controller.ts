import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express'; // <-- Import the native Express Request
import { AttendanceService } from './attendance.service';
import { ClockInDto } from './dto/clock-in.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: {
    id: string;
  };
}

@Controller('hr/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @UseGuards(JwtAuthGuard)
  @Post('clock-in')
  async clockIn(@Req() req: RequestWithUser, @Body() dto: ClockInDto) {
    const userId = req.user.id;

    return this.attendanceService.clockIn(userId, dto);
  }

  @Post('clock-out')
  async clockOut(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    return this.attendanceService.clockOut(userId);
  }
}
