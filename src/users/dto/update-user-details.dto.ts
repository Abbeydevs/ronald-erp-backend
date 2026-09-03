import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Role, WorkMode } from '@prisma/client';

export class UpdateUserDetailsDto {
  @IsEnum(Role, { message: 'Invalid role provided' })
  @IsOptional()
  role?: Role;

  @IsEnum(WorkMode, { message: 'Invalid work mode provided' })
  @IsOptional()
  workMode?: WorkMode;

  @IsString()
  @IsOptional()
  branchId?: string;
}
