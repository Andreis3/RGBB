import { IsEmail, IsNotEmpty, ValidateNested } from 'class-validator';

import { Type } from 'class-transformer';

export class VerifyCodeEmailDto {
  @IsNotEmpty()
  code: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class EncodeDto {
  @IsNotEmpty()
  text: string;
}

export class PayloadEncodeWebHook {
  @ValidateNested({ each: true })
  @Type(() => EncodeDto)
  input: EncodeDto;
}
export class PayloadVerifyCodeEmailWebHook {
  @ValidateNested({ each: true })
  @Type(() => VerifyCodeEmailDto)
  input: VerifyCodeEmailDto;
}

export class VerifyCodePhoneDto {
  @IsNotEmpty()
  code: string;

  @IsNotEmpty()
  phone_number: string;
}

export class PayloadVerifyCodePhoneWebHook {
  @ValidateNested({ each: true })
  @Type(() => VerifyCodePhoneDto)
  input: VerifyCodePhoneDto;
}
