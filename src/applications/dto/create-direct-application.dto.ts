import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateDirectApplicationDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  countryChoice?: string;

  @IsString()
  @IsOptional()
  courseOfStudy?: string;

  @IsString()
  @IsOptional()
  referredById?: string;
}
