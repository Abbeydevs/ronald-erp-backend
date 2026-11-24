import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import * as express from 'express';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { ResendWebhookPayload } from './campaigns.service';
import { CampaignsService } from './campaigns.service';
import {
  AddContactsToAudienceDto,
  CreateAudienceDto,
} from './dto/audience.dto';
import {
  CreateCampaignDto,
  SendTestCampaignDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';

interface AuthenticatedRequest extends express.Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get('unsubscribe')
  async unsubscribe(
    @Query('email') email: string,
    @Query('token') token: string,
    @Res() res: express.Response,
  ) {
    const html = await this.campaignsService.handleUnsubscribe(email, token);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  @Post('webhooks/resend')
  async handleResendWebhook(@Body() payload: ResendWebhookPayload) {
    return this.campaignsService.handleResendWebhook(payload);
  }

  @Post('audiences')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  createAudience(
    @Body() dto: CreateAudienceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.campaignsService.createAudience(dto, req.user.id);
  }

  @Get('audiences')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  getAllAudiences() {
    return this.campaignsService.getAllAudiences();
  }

  @Get('audiences/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  getAudienceById(@Param('id') id: string) {
    return this.campaignsService.getAudienceById(id);
  }

  @Delete('audiences/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  deleteAudience(@Param('id') id: string) {
    return this.campaignsService.deleteAudience(id);
  }

  @Post('audiences/:id/contacts')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  addContactsToAudience(
    @Param('id') id: string,
    @Body() dto: AddContactsToAudienceDto,
  ) {
    return this.campaignsService.addContactsToAudience(id, dto);
  }

  @Delete('audiences/:id/contacts/:contactId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  removeContactFromAudience(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.campaignsService.removeContactFromAudience(id, contactId);
  }

  @Get('audiences/:id/export')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  async exportAudienceCsv(
    @Param('id') id: string,
    @Res() res: express.Response,
  ) {
    const { filename, csv } = await this.campaignsService.exportAudienceCsv(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  createCampaign(
    @Body() dto: CreateCampaignDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.campaignsService.createCampaign(dto, req.user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  getAllCampaigns() {
    return this.campaignsService.getAllCampaigns();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  getCampaignById(@Param('id') id: string) {
    return this.campaignsService.getCampaignById(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.updateCampaign(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  deleteCampaign(@Param('id') id: string) {
    return this.campaignsService.deleteCampaign(id);
  }

  @Post(':id/test')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  sendTestEmail(@Param('id') id: string, @Body() dto: SendTestCampaignDto) {
    return this.campaignsService.sendTestEmail(id, dto.testEmail);
  }

  @Post(':id/send')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  launchCampaign(@Param('id') id: string) {
    return this.campaignsService.launchCampaign(id);
  }
}
