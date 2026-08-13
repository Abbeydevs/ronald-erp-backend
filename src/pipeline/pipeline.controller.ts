import { Controller, Post, Param, Req, UseGuards } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import * as express from 'express';

interface RequestWithUser extends express.Request {
  user: {
    id: string;
    role: Role;
  };
}

@Controller('pipeline')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post('onboard/:leadId')
  @Roles(Role.SUPER_ADMIN, Role.ADMISSIONS_COUNSELLOR)
  async onboardToStudent(
    @Param('leadId') leadId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.pipelineService.onboardStudent(leadId, req.user.id);
  }
}
