import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { ApplicationStage } from '@prisma/client';

export class SubmitProofOfWorkDto {
  @IsEnum(ApplicationStage, {
    message: 'Invalid application stage provided.',
  })
  @IsNotEmpty()
  stage!: ApplicationStage;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;
}
