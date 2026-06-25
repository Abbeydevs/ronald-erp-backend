import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateInviteDto {
  @IsEmail({}, { message: 'Target invitation email must be a valid address.' })
  email!: string;

  @IsEnum(Role, {
    message: 'Role must match an authorized system administrative profile.',
  })
  @IsNotEmpty()
  role!: Role;
}
