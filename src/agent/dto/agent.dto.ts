import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateLeadDto } from '../../leads/dto/create-lead.dto';

export class UpdateAgentProfileDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  swiftCode?: string;
}

export class TargetSchoolDto {
  @IsString()
  @IsOptional()
  institutionId?: string;

  @IsString()
  @IsOptional()
  customInstitutionName?: string;
}

export class SubmitAgentLeadDto extends CreateLeadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TargetSchoolDto)
  @IsOptional()
  targetSchools?: TargetSchoolDto[];
}
