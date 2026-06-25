import { Module } from '@nestjs/common';
import { BranchesController } from './branches/branches.controller';
import { BranchesService } from './branches/branches.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceCronService } from './attendance-cron.service';

@Module({
  controllers: [BranchesController, AttendanceController],
  providers: [BranchesService, AttendanceService, AttendanceCronService],
})
export class HrAttendanceModule {}
