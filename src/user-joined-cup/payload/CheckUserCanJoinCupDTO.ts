import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class UserJoinCupDTO {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  exchangeKeyId: string;

  @IsNotEmpty()
  @IsString()
  cupId: string;
}

export class PayloadUserJoinCupWebhook {
  @ValidateNested({ each: true })
  @Type(() => UserJoinCupDTO)
  input: UserJoinCupDTO;
}
