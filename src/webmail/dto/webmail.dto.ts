import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendEmailDto {
  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  draftId?: string;
}

export class SaveDraftDto {
  @IsString()
  @IsOptional()
  to?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;
}
