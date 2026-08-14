import { IsEnum } from 'class-validator';
import { ApplicationStage } from '@prisma/client';

export class UpdateStageDto {
  @IsEnum(ApplicationStage, {
    message: 'Invalid application stage provided.',
  })
  stage!: ApplicationStage;
}
