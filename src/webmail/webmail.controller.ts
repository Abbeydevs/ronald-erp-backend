import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WebmailService } from './webmail.service';
import { AuthGuard } from '@nestjs/passport';
import { SendEmailDto, SaveDraftDto } from './dto/webmail.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('webmail')
@UseGuards(AuthGuard('jwt'))
export class WebmailController {
  constructor(private readonly webmailService: WebmailService) {}

  @Get('inbox')
  async getInbox(@Req() req: RequestWithUser) {
    const data = await this.webmailService.getEmailsFromFolder(
      req.user.id,
      'INBOX',
    );
    return { success: true, data };
  }

  @Get('sent')
  async getSent(@Req() req: RequestWithUser) {
    const data = await this.webmailService.getEmailsFromFolder(
      req.user.id,
      'Sent',
    );
    return { success: true, data };
  }

  @Post('send')
  async sendEmail(@Req() req: RequestWithUser, @Body() dto: SendEmailDto) {
    return this.webmailService.sendEmail(req.user.id, dto);
  }

  @Get('drafts')
  async getDrafts(@Req() req: RequestWithUser) {
    const data = await this.webmailService.getDrafts(req.user.id);
    return { success: true, data };
  }

  @Post('drafts')
  async saveDraft(@Req() req: RequestWithUser, @Body() dto: SaveDraftDto) {
    return this.webmailService.saveDraft(req.user.id, dto);
  }

  @Delete('drafts/:id')
  async deleteDraft(@Req() req: RequestWithUser, @Param('id') draftId: string) {
    return this.webmailService.deleteDraft(req.user.id, draftId);
  }
}
