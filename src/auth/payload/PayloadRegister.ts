import { IsEmail, IsNotEmpty, IsPhoneNumber, ValidateNested } from 'class-validator';

import { Type } from 'class-transformer';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  user_name: string;

  @IsNotEmpty()
  full_name: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  phone_number: string;

  @IsNotEmpty()
  phone_code: string;
}

export class RegisterSsoDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  user_name: string;

  @IsNotEmpty()
  login_type: number;

  @IsNotEmpty()
  full_name: string;

  @IsNotEmpty()
  phone_number: string;

  @IsNotEmpty()
  phone_code: string;
}

export class RegisterPayloadWebHook {
  @ValidateNested({ each: true })
  @Type(() => RegisterDto)
  input: RegisterDto;
}

export class RegisterPayloadSsoWebHook {
  @ValidateNested({ each: true })
  @Type(() => RegisterSsoDto)
  input: RegisterSsoDto;
}
