import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { LeadSource } from '@prisma/client';

export class CreateLeadDto {
  @IsString()
  firstName!: string;

  @IsString()
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
  budget?: string;

  @IsString()
  @IsOptional()
  courseOfStudy?: string;

  @IsEnum(LeadSource)
  @IsOptional()
  source?: LeadSource;

  @IsString()
  @IsOptional()
  referredById?: string;
}

export class BulkAssignDto {
  @IsArray()
  @IsString({ each: true })
  leadIds!: string[];

  @IsString()
  counsellorId!: string;
}

export class FacebookLeadgenValue {
  leadgen_id?: string;
  ad_id?: string;
  form_id?: string;
  created_time?: number;
  page_id?: string;
  adgroup_id?: string;
}

export class FacebookWebhookChange {
  field?: string;
  value?: FacebookLeadgenValue;
}

export class FacebookWebhookEntry {
  id?: string;
  time?: number;
  changes?: FacebookWebhookChange[];
}

export class FacebookWebhookPayload {
  object?: string;
  entry?: FacebookWebhookEntry[];
}
