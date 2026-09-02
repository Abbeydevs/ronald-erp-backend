import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DayOfWeek, Role, WorkMode } from '@prisma/client';

export class CreateInviteDto {
  @IsEmail({}, { message: 'Target invitation email must be a valid address.' })
  email!: string;

  @IsEnum(Role, {
    message: 'Role must match an authorized system administrative profile.',
  })
  @IsNotEmpty()
  role!: Role;

  @IsEnum(WorkMode, {
    message: 'Work mode must be ONSITE, REMOTE, or HYBRID.',
  })
  @IsOptional()
  workMode?: WorkMode;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @IsOptional()
  remoteDays?: DayOfWeek[];
}
