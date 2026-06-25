import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('hr/branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post('create')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async createBranch(@Body() dto: CreateBranchDto) {
    return this.branchesService.createBranch(dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async getAllBranches() {
    return this.branchesService.getAllBranches();
  }
}
