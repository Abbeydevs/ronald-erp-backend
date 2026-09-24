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
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService } from './leads.service';
import {
  CreateLeadDto,
  BulkAssignDto,
  FacebookWebhookPayload,
  ArchiveLeadDto,
} from './dto/create-lead.dto';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { LeadSource, Role } from '@prisma/client';

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
  getAllLeads(@Query('archived') archived?: string) {
    const isArchived = archived === 'true';
    return this.leadsService.getAllLeads(isArchived);
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

  @Post(':id/archive')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  archiveLead(@Param('id') id: string, @Body() dto: ArchiveLeadDto) {
    return this.leadsService.archiveLead(id, dto);
  }

  @Post(':id/unarchive')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  unarchiveLead(@Param('id') id: string) {
    return this.leadsService.unarchiveLead(id);
  }

  @Get('students')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  getActiveStudents(@Query('archived') archived?: string) {
    const isArchived = archived === 'true';
    return this.leadsService.getActiveStudents(isArchived);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  async getLeadById(@Param('id') id: string) {
    return this.leadsService.getLeadById(id);
  }

  @Patch(':id/target')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  updateTarget(
    @Param('id') id: string,
    @Body()
    body: {
      finalInstitution?: string;
      countryChoice?: string;
      courseOfStudy?: string;
    },
  ) {
    return this.leadsService.updateTargetDetails(id, body);
  }

  @Patch(':id/notes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  updateNotes(@Param('id') id: string, @Body() body: { notes: string }) {
    return this.leadsService.updateCounsellorNotes(id, body.notes);
  }

  @Post('landing-page')
  async handleLandingPageWebhook(
    @Headers('x-api-key') apiKey: string,
    @Body() createLeadDto: CreateLeadDto,
  ) {
    const validKey =
      process.env.LANDING_PAGE_API_KEY || 'ronald_partners_secret_2024';

    if (apiKey !== validKey) {
      throw new UnauthorizedException('Invalid or missing API Key');
    }

    createLeadDto.source = LeadSource.WEBSITE;

    return this.leadsService.create(createLeadDto);
  }
}
