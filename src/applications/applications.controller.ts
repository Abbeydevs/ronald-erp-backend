import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { UpdateStageDto } from './dto/update-stage.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import * as express from 'express';

interface RequestWithUser extends express.Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('applications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get('board')
  @Roles(
    Role.SUPER_ADMIN,
    Role.COMPLIANCE_HR,
    Role.ADMISSIONS_COUNSELLOR,
    Role.FINANCE_OFFICER,
    Role.VISA_OFFICER,
  )
  getBoard(@Req() req: RequestWithUser) {
    return this.applicationsService.getBoardApplications(req.user);
  }

  @Patch(':id/stage')
  @Roles(
    Role.SUPER_ADMIN,
    Role.COMPLIANCE_HR,
    Role.ADMISSIONS_COUNSELLOR,
    Role.FINANCE_OFFICER,
    Role.VISA_OFFICER,
  )
  updateStage(@Param('id') id: string, @Body() updateStageDto: UpdateStageDto) {
    return this.applicationsService.updateApplicationStage(id, updateStageDto);
  }
}
