import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  Matches,
  IsOptional,
} from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  radiusMeters?: number;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'openingTime must be in HH:mm format (e.g., 09:00)',
  })
  openingTime!: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'closingTime must be in HH:mm format (e.g., 18:00)',
  })
  closingTime!: string;
}
