import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleTaskDto {
  @IsBoolean()
  @IsNotEmpty()
  isCompleted!: boolean;
}
