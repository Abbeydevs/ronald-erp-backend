import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  Post,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { UpdateStageDto } from './dto/update-stage.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import * as express from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubmitProofOfWorkDto } from './dto/submit-proof-of-work.dto';
import { ToggleTaskDto } from './dto/toggle-task.dto';

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

  @Post(':id/proof-of-work')
  @Roles(
    Role.SUPER_ADMIN,
    Role.COMPLIANCE_HR,
    Role.ADMISSIONS_COUNSELLOR,
    Role.FINANCE_OFFICER,
    Role.VISA_OFFICER,
  )
  @UseInterceptors(FileInterceptor('file'))
  submitProofOfWork(
    @Param('id') id: string,
    @Body() dto: SubmitProofOfWorkDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException(
        'A screenshot or evidence file is required to advance stage.',
      );
    }
    return this.applicationsService.submitProofOfWork(
      id,
      req.user.id,
      dto,
      file,
    );
  }

  @Patch('tasks/:taskId/toggle')
  @Roles(
    Role.SUPER_ADMIN,
    Role.COMPLIANCE_HR,
    Role.ADMISSIONS_COUNSELLOR,
    Role.VISA_OFFICER,
  )
  toggleTask(@Param('taskId') taskId: string, @Body() dto: ToggleTaskDto) {
    return this.applicationsService.toggleTaskStatus(taskId, dto.isCompleted);
  }
}
