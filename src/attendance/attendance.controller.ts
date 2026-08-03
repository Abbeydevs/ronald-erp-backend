import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ClockInDto } from './dto/clock-in.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { Role } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('attendance')
@UseGuards(AuthGuard('jwt'))
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  async clockIn(@Body() dto: ClockInDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const record = await this.attendanceService.clockIn(userId, dto);

    return {
      success: true,
      message: 'Clock-in successful.',
      data: record,
    };
  }
}
