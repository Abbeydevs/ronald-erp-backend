import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AudienceContactSource } from '@prisma/client';

export class CreateAudienceDto {
  @IsString()
  @IsNotEmpty({ message: 'Audience name is required.' })
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class ContactInputDto {
  @IsEmail({}, { message: 'Each contact must have a valid email address.' })
  email!: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(AudienceContactSource)
  @IsOptional()
  source?: AudienceContactSource;
}

export class AddContactsToAudienceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactInputDto)
  @IsOptional()
  contacts?: ContactInputDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  leadIds?: string[];
}
