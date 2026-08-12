import { Module } from '@nestjs/common';
import { CallGateway } from './call/call.gateway';

@Module({
  providers: [CallGateway],
})
export class CommunicationModule {}
