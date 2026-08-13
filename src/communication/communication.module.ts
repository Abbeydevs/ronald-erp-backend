import { Module } from '@nestjs/common';
import { CallGateway } from './call/call.gateway';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarService } from './google-calendar/google-calendar.service';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [CommunicationController],
  providers: [
    CallGateway,
    CommunicationService,
    PrismaService,
    GoogleCalendarService,
  ],
  exports: [CommunicationService],
})
export class CommunicationModule {}
