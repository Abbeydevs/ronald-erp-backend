import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService } from './leads.service';
import {
  CreateLeadDto,
  BulkAssignDto,
  FacebookWebhookPayload,
} from './dto/create-lead.dto';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('webhooks/facebook')
  verifyFacebookWebhook(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const VERIFY_TOKEN =
      process.env.FACEBOOK_VERIFY_TOKEN || 'ronald_partners_secure_token';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send('Forbidden');
    }
  }

  @Post('webhooks/facebook')
  async receiveFacebookLead(@Body() body: FacebookWebhookPayload) {
    return this.leadsService.processFacebookLead(body);
  }

  @Post('public')
  createPublicLead(@Body() createLeadDto: CreateLeadDto) {
    if (!createLeadDto.source) {
      createLeadDto.source = 'WEBSITE';
    }
    return this.leadsService.create(createLeadDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  getAllLeads() {
    return this.leadsService.getAllLeads();
  }

  @Post('manual')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  @Get('pool')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  getUnassignedPool() {
    return this.leadsService.getUnassignedPool();
  }

  @Get('my-leads/:userId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMISSIONS_COUNSELLOR, Role.SUPER_ADMIN)
  getMyLeads(@Param('userId') userId: string) {
    return this.leadsService.getMyLeads(userId);
  }

  @Patch('bulk-assign')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  bulkAssign(@Body() bulkAssignDto: BulkAssignDto) {
    return this.leadsService.bulkAssign(bulkAssignDto);
  }
}
