import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import {
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from './dto/institution.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('institutions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_OFFICER, Role.COMPLIANCE_HR)
  create(@Body() createInstitutionDto: CreateInstitutionDto) {
    return this.institutionsService.create(createInstitutionDto);
  }

  @Get('admin')
  @Roles(
    Role.SUPER_ADMIN,
    Role.FINANCE_OFFICER,
    Role.COMPLIANCE_HR,
    Role.ADMISSIONS_COUNSELLOR,
  )
  findAllForAdmin() {
    return this.institutionsService.findAllForAdmin();
  }

  @Get('public')
  @Roles(Role.SUB_AGENT, Role.SUPER_ADMIN, Role.ADMISSIONS_COUNSELLOR)
  findAllForAgents() {
    return this.institutionsService.findAllForAgents();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_OFFICER)
  findOne(@Param('id') id: string) {
    return this.institutionsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_OFFICER)
  update(
    @Param('id') id: string,
    @Body() updateInstitutionDto: UpdateInstitutionDto,
  ) {
    return this.institutionsService.update(id, updateInstitutionDto);
  }

  @Patch(':id/toggle')
  @Roles(Role.SUPER_ADMIN)
  toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.institutionsService.toggleActive(id, isActive);
  }
}
