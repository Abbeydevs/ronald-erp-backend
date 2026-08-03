import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty({ message: 'Branch name is required' })
  name!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsNotEmpty({ message: 'Valid latitude is required' })
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsNotEmpty({ message: 'Valid longitude is required' })
  longitude!: number;

  @IsNumber()
  @IsOptional()
  @Min(10, { message: 'Radius must be at least 10 meters' })
  radiusMeters?: number;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Opening time must be in HH:MM format (e.g., 09:00)',
  })
  openingTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Closing time must be in HH:MM format (e.g., 17:00)',
  })
  closingTime?: string;
}
