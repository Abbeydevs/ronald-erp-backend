import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role, Branch } from '@prisma/client';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Controller('branch')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post('create')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async createBranch(
    @Body() createBranchDto: CreateBranchDto,
  ): Promise<{ success: boolean; message: string; data: Branch }> {
    const branch = await this.branchService.createBranch(createBranchDto);

    return {
      success: true,
      message: 'Office branch configured successfully.',
      data: branch,
    };
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async getAllBranches(): Promise<{ success: boolean; data: Branch[] }> {
    const branches = await this.branchService.findAll();
    return {
      success: true,
      data: branches,
    };
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async updateBranch(
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ): Promise<{ success: boolean; message: string; data: Branch }> {
    const branch = await this.branchService.updateBranch(id, updateBranchDto);
    return {
      success: true,
      message: 'Branch updated successfully.',
      data: branch,
    };
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.COMPLIANCE_HR)
  async deleteBranch(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.branchService.deleteBranch(id);
    return {
      success: true,
      message: 'Branch deleted successfully.',
    };
  }
}
