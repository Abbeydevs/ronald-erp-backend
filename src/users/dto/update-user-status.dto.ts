import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;

  @IsString()
  @IsOptional()
  reassignToId?: string;
}
