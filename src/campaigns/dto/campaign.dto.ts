import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty({ message: 'Campaign name is required.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Email subject is required.' })
  subject!: string;

  @IsString()
  @IsNotEmpty({ message: 'Email body is required.' })
  bodyHtml!: string;

  @IsString()
  @IsNotEmpty({ message: 'Target audience is required.' })
  audienceId!: string;

  @IsEmail({}, { message: 'Reply-To must be a valid email address.' })
  @IsOptional()
  replyTo?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}

export class UpdateCampaignDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  bodyHtml?: string;

  @IsString()
  @IsOptional()
  audienceId?: string;

  @IsEmail()
  @IsOptional()
  replyTo?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}

export class SendTestCampaignDto {
  @IsEmail({}, { message: 'Please provide a valid test email address.' })
  @IsNotEmpty()
  testEmail!: string;
}
