import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

export class ConnectEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  appPassword!: string;
}

export class UpdateSignatureDto {
  @IsString()
  @IsNotEmpty()
  signature!: string;
}
