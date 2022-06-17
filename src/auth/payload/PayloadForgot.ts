import { IsEmail, IsNotEmpty, ValidateNested } from 'class-validator';

import { Type } from 'class-transformer';

export class ForgotByEmailDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class ChangeEmailDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class PayloadChangeEmailWebhook {
  @ValidateNested({ each: true })
  @Type(() => ChangeEmailDto)
  input: ChangeEmailDto;
}

export class PayloadForgotByEmailWebHook {
  @ValidateNested({ each: true })
  @Type(() => ForgotByEmailDto)
  input: ForgotByEmailDto;
}

export class ForgotByPhoneDto {
  @IsNotEmpty()
  phone_number: string;
}

export class PayloadForgotByPhoneWebHook {
  @ValidateNested({ each: true })
  @Type(() => ForgotByPhoneDto)
  input: ForgotByPhoneDto;
}

export class UpdatePassWordDto {
  @IsNotEmpty()
  type: number;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  condition: string;
}

export class PayloadUpdatePasswordWebHook {
  @ValidateNested({ each: true })
  @Type(() => UpdatePassWordDto)
  input: UpdatePassWordDto;
}
