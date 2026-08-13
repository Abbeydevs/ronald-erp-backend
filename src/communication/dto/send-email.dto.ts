import { IsString, IsNotEmpty } from 'class-validator';

export class SendEmailDto {
  @IsString()
  @IsNotEmpty()
  leadId!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
