import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAttendanceController } from './admin-attendance.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceController, AdminAttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
