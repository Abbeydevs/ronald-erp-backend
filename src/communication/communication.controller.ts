import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { CommunicationService } from './communication.service';
import { ScheduleMeetDto, SendEmailDto } from './dto';
import { ResendInboundEmailPayload } from './dto/resend-webhook.dto';

interface RequestWithUser extends Express.Request {
  user: {
    id: string;
    role: Role;
  };
}

@Controller('communication')
export class CommunicationController {
  constructor(private readonly commService: CommunicationService) {}

  @Post('calls/save-stream')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  async saveStream(
    @UploadedFile() file: Express.Multer.File,
    @Body('leadId') leadId: string,
    @Body('duration') duration: number,
    @Body('notes') notes: string,
    @Req() req: RequestWithUser,
  ) {
    return this.commService.saveCallLog(
      {
        leadId,
        counsellorId: req.user.id,
        duration,
        notes,
      },
      file,
    );
  }

  @Post('schedule/meet')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  async scheduleMeet(
    @Body() dto: ScheduleMeetDto,
    @Req() req: RequestWithUser,
  ) {
    return this.commService.scheduleMeet(dto, req.user.id);
  }

  @Post('send-email')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  async sendEmail(@Body() dto: SendEmailDto, @Req() req: RequestWithUser) {
    return this.commService.sendEmailToStudent(dto, req.user.id);
  }

  @Get('timeline/:leadId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  async getLeadTimeline(@Param('leadId') leadId: string) {
    return this.commService.getLogsForLead(leadId);
  }

  @Get('logs/:leadId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  async getLeadLogs(@Param('leadId') leadId: string) {
    return this.commService.getLogsForLead(leadId);
  }

  @Post('webhook/inbound')
  async receiveInboundEmail(@Body() payload: ResendInboundEmailPayload) {
    await this.commService.handleInboundEmailWebhook(payload);
    return { success: true };
  }

  @Post('send-document')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async sendDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('leadId') leadId: string,
    @Body('subject') subject: string,
    @Body('message') message: string,
    @Req() req: RequestWithUser,
  ) {
    return this.commService.sendDocumentToStudent(
      leadId,
      subject,
      message,
      file,
      req.user.id,
    );
  }
}
