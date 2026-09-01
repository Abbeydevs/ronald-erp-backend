import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateLeadTargetDto {
  @IsString()
  @IsNotEmpty()
  finalInstitution!: string;

  @IsString()
  @IsOptional()
  countryChoice?: string;

  @IsString()
  @IsOptional()
  courseOfStudy?: string;
}
