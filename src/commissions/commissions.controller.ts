import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import {
  CalculateCommissionDto,
  UpdateCommissionStatusDto,
} from './dto/commission.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('commissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('pending-payouts')
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_OFFICER)
  getPendingPayouts() {
    return this.commissionsService.getPendingPayouts();
  }

  @Post(':targetSchoolId/calculate')
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_OFFICER)
  calculateCommission(
    @Param('targetSchoolId') targetSchoolId: string,
    @Body() dto: CalculateCommissionDto,
  ) {
    return this.commissionsService.calculateCommission(targetSchoolId, dto);
  }

  @Patch(':targetSchoolId/status')
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_OFFICER)
  updateStatus(
    @Param('targetSchoolId') targetSchoolId: string,
    @Body() dto: UpdateCommissionStatusDto,
  ) {
    return this.commissionsService.updateStatus(targetSchoolId, dto);
  }
}
