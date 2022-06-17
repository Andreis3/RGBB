import { IsEmail, IsNotEmpty, ValidateNested } from 'class-validator';

import { Type } from 'class-transformer';

export class UpdateProfileDto {
  avatar: string;
  description: string;
  email: string;
  phone_number: string;
  full_name: string;
  user_name: string;
}

export class ProfileDto {
  avatar: string;
  description: string;
  phone_code: string;
  id: string;
  email: string;
  phone_number: string;
  full_name: string;
  user_name: string;
  is_verify_email: boolean;
  login_type: number;
}

export class ChangePasswordDto {
  @IsNotEmpty()
  old_password: string;

  @IsNotEmpty()
  password: string;
}

export class VerifyPasswordDto {
  @IsNotEmpty()
  password: string;
}

export class PayloadUpdateProfileWebHook {
  @ValidateNested({ each: true })
  @Type(() => UpdateProfileDto)
  input: UpdateProfileDto;
}

export class PayloadChangePasswordWebHook {
  @ValidateNested({ each: true })
  @Type(() => ChangePasswordDto)
  input: ChangePasswordDto;
}

export class PayloadVerifyPasswordWebHook {
  @ValidateNested({ each: true })
  @Type(() => VerifyPasswordDto)
  input: VerifyPasswordDto;
}
