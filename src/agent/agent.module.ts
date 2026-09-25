import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { EmailModule } from 'src/email/email.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [EmailModule, PrismaModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
