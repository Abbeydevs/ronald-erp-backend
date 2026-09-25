import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { UpdateAgentProfileDto, SubmitAgentLeadDto } from './dto/agent.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: Role };
}

@Controller('agent')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUB_AGENT)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('profile')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.agentService.getProfile(req.user.id);
  }

  @Patch('profile')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateAgentProfileDto,
  ) {
    return this.agentService.updateProfile(req.user.id, dto);
  }

  @Get('dashboard')
  getDashboardStats(@Req() req: AuthenticatedRequest) {
    return this.agentService.getDashboardStats(req.user.id);
  }

  @Post('students')
  submitStudent(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubmitAgentLeadDto,
  ) {
    return this.agentService.submitStudent(req.user.id, dto);
  }

  @Get('students')
  getMyStudents(@Req() req: AuthenticatedRequest) {
    return this.agentService.getMyStudents(req.user.id);
  }
}
