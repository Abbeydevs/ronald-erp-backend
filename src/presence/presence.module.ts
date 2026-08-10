import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { PresenceGateway } from './presence.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { PresenceController } from './presence.controller';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [PresenceService, PresenceGateway],
  controllers: [PresenceController],
})
export class PresenceModule {}
