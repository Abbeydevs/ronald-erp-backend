import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateInstitutionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsNumber()
  @IsOptional()
  schoolCommissionAmount?: number;

  @IsNumber()
  @IsOptional()
  agentCommissionPercentage?: number;
}

export class UpdateInstitutionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsNumber()
  @IsOptional()
  schoolCommissionAmount?: number;

  @IsNumber()
  @IsOptional()
  agentCommissionPercentage?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
