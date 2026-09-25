import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { CommissionStatus } from '@prisma/client';

export class CalculateCommissionDto {
  @IsNumber()
  schoolCommissionAmount!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  customAgentPercentage?: number;
}

export class UpdateCommissionStatusDto {
  @IsEnum(CommissionStatus)
  status!: CommissionStatus;
}
