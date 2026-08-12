import { Module } from '@nestjs/common';
import { CallGateway } from './call/call.gateway';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CommunicationController],
  providers: [CallGateway, CommunicationService, PrismaService],
})
export class CommunicationModule {}
