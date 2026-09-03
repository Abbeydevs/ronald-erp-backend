import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ResendInboundEmailData {
  @IsArray()
  @IsString({ each: true })
  to!: string[];

  @IsString()
  from!: string;

  @IsString()
  subject!: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  html?: string;
}

export class ResendInboundEmailPayload {
  @IsString()
  type!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResendInboundEmailData)
  data?: ResendInboundEmailData;
}
