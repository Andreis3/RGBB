import { IsEmail, IsNotEmpty, IsObject, IsDefined, ValidateNested } from 'class-validator';

import { Type } from 'class-transformer';

export class LoginDto {
  @IsEmail()
  username: string;

  @IsNotEmpty()
  password: string;
}

export class LoginPayloadWebHook {
  @ValidateNested({ each: true })
  @Type(() => LoginDto)
  input: LoginDto;
}

export class LoginGoogleDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  full_name: string;
}

export class LoginAppleDto {
  @IsEmail()
  email: string;
}

export class LoginPayloadAppleWebHook {
  @ValidateNested({ each: true })
  @Type(() => LoginAppleDto)
  input: LoginAppleDto;
}

export class LoginPayloadGoogleWebHook {
  @ValidateNested({ each: true })
  @Type(() => LoginGoogleDto)
  input: LoginGoogleDto;
}
