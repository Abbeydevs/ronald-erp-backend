import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsISO8601,
} from 'class-validator';

export class ScheduleMeetDto {
  @IsString()
  @IsNotEmpty()
  leadId!: string;

  @IsString()
  @IsNotEmpty()
  summary!: string;

  @IsString()
  @IsOptional()
  description!: string;

  @IsISO8601()
  @IsNotEmpty()
  scheduledAt!: string;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number;
}
