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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { CommunicationService } from './communication.service';

interface RequestWithUser extends Express.Request {
  user: {
    id: string;
    role: Role;
  };
}

@Controller('communication')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CommunicationController {
  constructor(private readonly commService: CommunicationService) {}

  @Post('calls/save-stream')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/recordings',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || '.webm';
          callback(null, `call-${uniqueSuffix}${ext}`);
        },
      }),
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

  @Get('logs/:leadId')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR, Role.ADMISSIONS_COUNSELLOR)
  async getLeadLogs(@Param('leadId') leadId: string) {
    return this.commService.getLogsForLead(leadId);
  }
}
