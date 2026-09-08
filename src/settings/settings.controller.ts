import { Controller, Post, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport';
import { ConnectEmailDto, UpdateSignatureDto } from './dto/email-settings.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('settings')
@UseGuards(AuthGuard('jwt'))
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post('email/connect')
  async connectEmail(
    @Req() req: RequestWithUser,
    @Body() dto: ConnectEmailDto,
  ) {
    return this.settingsService.connectEmail(req.user.id, dto);
  }

  @Post('email/disconnect')
  async disconnectEmail(@Req() req: RequestWithUser) {
    return this.settingsService.disconnectEmail(req.user.id);
  }

  @Patch('email/signature')
  async updateSignature(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateSignatureDto,
  ) {
    return this.settingsService.updateSignature(req.user.id, dto);
  }
}
