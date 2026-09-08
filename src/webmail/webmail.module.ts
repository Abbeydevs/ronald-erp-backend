import { Module } from '@nestjs/common';
import { WebmailService } from './webmail.service';
import { WebmailController } from './webmail.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WebmailService],
  controllers: [WebmailController],
})
export class WebmailModule {}
