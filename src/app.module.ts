import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HrAttendanceModule } from './hr-attendance/hr-attendance.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule } from './email/email.module';
import { BranchModule } from './branch/branch.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PresenceModule } from './presence/presence.module';
import { ReportsModule } from './reports/reports.module';
import { LeadsModule } from './leads/leads.module';
import { UsersModule } from './users/users.module';
import { CommunicationModule } from './communication/communication.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    HrAttendanceModule,
    EmailModule,
    BranchModule,
    AttendanceModule,
    PresenceModule,
    ReportsModule,
    LeadsModule,
    UsersModule,
    CommunicationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
