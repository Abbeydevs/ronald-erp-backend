import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  Body,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VaultService } from './vault.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role, DocumentType } from '@prisma/client';
import * as express from 'express';

interface RequestWithUser extends express.Request {
  user: {
    id: string;
    role: Role;
  };
}

@Controller('vault')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  @Roles(Role.STUDENT)
  async getVault(@Req() req: RequestWithUser) {
    return this.vaultService.getStudentVault(req.user.id);
  }

  @Get('my-documents')
  @Roles(Role.STUDENT)
  async getMyDocuments(@Req() req: RequestWithUser) {
    return this.vaultService.getStudentVault(req.user.id);
  }

  @Post('upload/:applicationId')
  @Roles(Role.STUDENT)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('applicationId') applicationId: string,
    @Body('type') type: DocumentType,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided for upload.');
    }

    if (!Object.values(DocumentType).includes(type)) {
      throw new BadRequestException('Invalid document type provided.');
    }

    return this.vaultService.uploadStudentDocument(
      req.user.id,
      applicationId,
      type,
      file,
    );
  }
}
