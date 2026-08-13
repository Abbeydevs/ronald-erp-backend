import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
} from 'class-validator';

export enum PortalType {
  STAFF = 'STAFF',
  STUDENT = 'STUDENT',
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  fingerprintHash!: string;

  @IsEnum(PortalType)
  @IsOptional()
  portalType?: PortalType;
}
