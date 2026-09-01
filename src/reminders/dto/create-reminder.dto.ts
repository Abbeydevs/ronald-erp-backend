import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApplicationStage } from '@prisma/client';

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty()
  note!: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate!: string;

  @IsString()
  @IsOptional()
  applicationId?: string;

  @IsEnum(ApplicationStage)
  @IsOptional()
  stage?: ApplicationStage;
}
