import {
  Controller,
  HttpCode,
  Inject,
  HttpException,
  HttpStatus,
  Post,
  Request,
  Body,
  Get,
  Param,
  Query,
} from '@nestjs/common';
const crypto = require('crypto');
import { AuthService } from './AuthService';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../entities/User';
import { Generate } from '../gennerate/Generate';
import { SendGridService } from '@anchan828/nest-sendgrid';
import { Sms } from '../sms/Sms';
import { LoginPayloadAppleWebHook, LoginPayloadGoogleWebHook, LoginPayloadWebHook } from './payload/PayloadLogin';
import { RegisterPayloadSsoWebHook, RegisterPayloadWebHook } from './payload/PayloadRegister';
import {
  PayloadChangeEmailWebhook,
  PayloadForgotByEmailWebHook,
  PayloadForgotByPhoneWebHook,
  PayloadUpdatePasswordWebHook,
} from './payload/PayloadForgot';
import {
  PayloadEncodeWebHook,
  PayloadVerifyCodeEmailWebHook,
  PayloadVerifyCodePhoneWebHook,
} from './payload/PayloadVerifyCode';
import { TypeNotSso, TypeVerify } from '../../enumerations/TypeVerify';
import {
  PayloadChangePasswordWebHook,
  PayloadUpdateProfileWebHook,
  PayloadVerifyPasswordWebHook,
  ProfileDto,
  UpdateProfileDto,
} from './payload/PayloadUpdateProfile';
import * as _ from 'lodash';

import { Not, getConnection, getManager, Raw, createConnection, ConnectionOptions } from 'typeorm';
import { FileUploadService } from '../file-upload/file-upload.service';
import { User, UserExchangesKeys } from '../../entities';
import { query } from 'express';
import * as moment from 'moment';
import { HasherProvider } from '../encrypt-decrypt-library/HasherProvider';
const { writeFileSync, readFileSync } = require('fs');
import * as fs from 'fs';
import { MAX_GENERATE, MIN_GENERATE } from '../../constant';
@Controller()
export class AuthController {
  @Inject()
  private readonly authService: AuthService;

  @Inject()
  private readonly fileUploadService: FileUploadService;

  @Inject()
  private readonly config: ConfigService;

  @Inject()
  private readonly sendGrid: SendGridService;

  @Inject()
  private readonly UserRepository: UserRepository;

  @Inject('Gen')
  private readonly gen: Generate;

  @Inject('Sms')
  private readonly sms: Sms;

  @Inject('FlockEncrypt')
  private readonly Encrypt: HasherProvider;

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginPayloadWebHook): Promise<{ access_token: string; id: string }> {
    //todo validate requred username and password
    const { username, password } = body.input;
    const user = await this.UserRepository.findOne({
      email: username.toLowerCase(),
      login_type: 1,
      is_verify_code: true,
      deleted_at: null,
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'EMAIL_INVALID',
          message: 'EMAIL_INVALID',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const isSamePassword = await this.authService.checkPassword(password, user);

    if (!isSamePassword) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'PASSWORD_WRONG',
          message: 'PASSWORD_WRONG',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      id: user.id,
      access_token: await this.authService.makeAccessToken({
        user_id: user?.id,
        email: user?.email,
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': ['user', 'admin'],
          'x-hasura-default-role': 'user',
          'x-hasura-role': 'user',
          'x-hasura-user-id': user.id,
        },
      }),
    };
  }

  @Post('login/google')
  @HttpCode(200)
  async loginGoogle(@Body() body: LoginPayloadGoogleWebHook): Promise<any> {
    //todo validate body request webhook
    const { email, full_name } = body.input;

    const user = await this.UserRepository.findOne({
      where: {
        email: email.toLowerCase(),
        is_verify_code: true,
        deleted_at: null,
      },
    });

    if (!user) {
      //todo auto register by account
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'REDIRECT_SIGN_UP_BY_GOOGLE',
          message: 'REDIRECT_SIGN_UP_BY_GOOGLE',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.login_type === TypeNotSso.EMAIL) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'LOGIN_BY_GOOGLE_REJECT',
          message: 'LOGIN_BY_GOOGLE_REJECT',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      id: user.id,
      access_token: await this.authService.makeAccessToken({
        user_id: user?.id,
        email: user?.email,
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': ['user', 'admin'],
          'x-hasura-default-role': 'user',
          'x-hasura-role': 'user',
          'x-hasura-user-id': user?.id,
        },
      }),
    };
  }

  @Post('login/apple')
  @HttpCode(200)
  async loginApple(@Body() body: LoginPayloadAppleWebHook): Promise<any> {
    //todo validate body request webhook
    const { email } = body.input;

    const user = await this.UserRepository.findOne({
      where: {
        email: email.toLowerCase(),
        is_verify_code: true,
        deleted_at: null,
      },
    });

    if (!user) {
      //todo auto register by account
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'REDIRECT_SIGN_UP_BY_APPLE',
          message: 'REDIRECT_SIGN_UP_BY_APPLE',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.login_type === TypeNotSso.EMAIL) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'LOGIN_BY_APPLE_REJECT',
          message: 'LOGIN_BY_APPLE_REJECT',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      id: user.id,
      access_token: await this.authService.makeAccessToken({
        user_id: user?.id,
        email: user?.email,
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': ['user', 'admin'],
          'x-hasura-default-role': 'user',
          'x-hasura-role': 'user',
          'x-hasura-user-id': user?.id,
        },
      }),
    };
  }

  @Post('verify_code')
  @HttpCode(200)
  async verifyCode(@Request() req): Promise<{ status: string }> {
    //todo validate body request webhook and check time code 60s
    const { code } = req.body.input;
    const userVerifyCode = await this.UserRepository.findOne({
      where: {
        code,
        id: req.body.session_variables['x-hasura-user-id'],
      },
    });

    if (!userVerifyCode) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'CODE_WRONG',
          message: 'CODE_WRONG',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.UserRepository.update(userVerifyCode.id, {
      is_verify_code: true,
    });

    return {
      status: 'success',
    };
  }

  @Post('resend_code')
  @HttpCode(200)
  async resendCode(@Request() req): Promise<{ status: string }> {
    const userResendCode = await this.UserRepository.findOne({
      where: {
        id: req.body.session_variables['x-hasura-user-id'],
      },
    });

    if (!userResendCode) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const code = this.gen.generate(MIN_GENERATE, MAX_GENERATE);
    await this.UserRepository.update(`${req.body.session_variables['x-hasura-user-id']}`, {
      code,
    });

    await this.sms.sendSms(userResendCode.phone_number, code);

    return {
      status: 'success',
    };
  }

  @Post('resend_code/email')
  @HttpCode(200)
  async resendCodeEmail(@Body() body: PayloadForgotByEmailWebHook): Promise<{ status: string }> {
    const { email } = body.input;

    const userResendCodeEmail = await this.UserRepository.findOne({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!userResendCodeEmail) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const code = this.gen.generate(MIN_GENERATE, MAX_GENERATE);
    await this.UserRepository.update(userResendCodeEmail.id, {
      code,
    });

    await this.authService.sendMailConfirmCode(code, userResendCodeEmail.full_name, userResendCodeEmail.email);
    return {
      status: 'success',
    };
  }

  @Post('resend_code/phone')
  @HttpCode(200)
  async resendCodePhone(@Body() body: PayloadForgotByPhoneWebHook): Promise<{ status: string }> {
    const { phone_number } = body.input;

    const userResendCodePhone = await this.UserRepository.findOne({
      where: {
        phone_number,
      },
    });

    if (!userResendCodePhone) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const code = this.gen.generate(MIN_GENERATE, MAX_GENERATE);
    await this.UserRepository.update(userResendCodePhone.id, {
      code,
    });

    await this.sms.sendSms(userResendCodePhone.phone_number, code);

    return {
      status: 'success',
    };
  }

  @Post('register')
  async register(@Body() body: RegisterPayloadWebHook): Promise<{ access_token: string; id: string }> {
    //todo validate email and password req webhook
    const { email, password, full_name, phone_number, user_name, phone_code } = body.input;

    const entityManager = getManager();
    const userDbUserName = await entityManager.query(
      'SELECT u.user_name FROM users AS u WHERE LOWER(u.user_name) = $1 AND u.is_verify_code = $2 AND u.deleted_at is null',
      [user_name.toLowerCase(), true],
    );

    if (userDbUserName.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'THE_USER_NAME_HAS_ALREADY_BEEN_TAKEN',
          message: 'THE_USER_NAME_HAS_ALREADY_BEEN_TAKEN',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const userDbEmail = await this.UserRepository.find({
      where: [{ email: email.toLowerCase(), is_verify_code: true, deleted_at: null }],
    });

    if (userDbEmail.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'THE_EMAIL_HAS_BEEN_REGISTERED',
          message: 'THE_EMAIL_HAS_BEEN_REGISTERED',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const userDbPhone = await this.UserRepository.find({
      where: [{ phone_number, is_verify_code: true, deleted_at: null }],
    });

    if (userDbPhone.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'THE_PHONE_HAS_ALREADY_BEEN_TAKEN',
          message: 'THE_PHONE_HAS_ALREADY_BEEN_TAKEN',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const code = this.gen.generate(MIN_GENERATE, MAX_GENERATE);

    const userHoldActive = await this.UserRepository.findOne({
      email: email.toLowerCase(),
      phone_number,
      deleted_at: null,
    });

    if (!userHoldActive) {
      const user = await this.UserRepository.save({
        code,
        phone_number,
        full_name: _.trim(full_name),
        user_name: _.trim(user_name),
        email: email.toLowerCase(),
        login_type: 1,
        phone_code,
        password: await this.authService.generatePassword(password),
      });

      await this.sms.sendSms(phone_number, code);

      return {
        access_token: await this.authService.makeAccessToken({
          user_id: user?.id,
          email: user?.email,
          'https://hasura.io/jwt/claims': {
            'x-hasura-allowed-roles': ['user', 'admin'],
            'x-hasura-default-role': 'user',
            'x-hasura-role': 'user',
            'x-hasura-user-id': user?.id,
          },
        }),
        id: user.id,
      };
    }

    await this.UserRepository.update(userHoldActive.id, {
      code,
      user_name,
      full_name,
      login_type: 1,
    });

    await this.sms.sendSms(phone_number, code);

    return {
      access_token: await this.authService.makeAccessToken({
        user_id: userHoldActive?.id,
        email: userHoldActive?.email,
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': ['user', 'admin'],
          'x-hasura-default-role': 'user',
          'x-hasura-role': 'user',
          'x-hasura-user-id': userHoldActive?.id,
        },
      }),
      id: userHoldActive.id,
    };
  }

  @Post('register/sso')
  async registerSso(@Body() body: RegisterPayloadSsoWebHook): Promise<{ access_token: string; id: string }> {
    //todo validate email and password req webhook
    const { email, full_name, phone_number, user_name, login_type, phone_code } = body.input;

    const entityManager = getManager();
    const userDbUserName = await entityManager.query(
      'SELECT u.user_name FROM users AS u WHERE LOWER(u.user_name) = $1 AND u.is_verify_code = $2 AND u.deleted_at is null',
      [user_name.toLowerCase(), true],
    );

    if (userDbUserName.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'THE_USER_NAME_HAS_ALREADY_BEEN_TAKEN',
          message: 'THE_USER_NAME_HAS_ALREADY_BEEN_TAKEN',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const userDbEmail = await this.UserRepository.find({
      where: [{ email: email.toLowerCase(), is_verify_code: true, deleted_at: null }],
    });

    if (userDbEmail.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'THE_EMAIL_HAS_BEEN_REGISTERED',
          message: 'THE_EMAIL_HAS_BEEN_REGISTERED',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const userDbPhone = await this.UserRepository.find({
      where: [{ phone_number, is_verify_code: true, deleted_at: null }],
    });

    if (userDbPhone.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'THE_PHONE_HAS_ALREADY_BEEN_TAKEN',
          message: 'THE_PHONE_HAS_ALREADY_BEEN_TAKEN',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const code = this.gen.generate(MIN_GENERATE, MAX_GENERATE);

    const userHoldActive = await this.UserRepository.findOne({
      email: email.toLowerCase(),
      phone_number,
      deleted_at: null,
    });

    if (!userHoldActive) {
      const user = await this.UserRepository.save({
        code,
        phone_number,
        full_name: _.trim(full_name),
        user_name: _.trim(user_name),
        email: email.toLowerCase(),
        login_type,
        phone_code,
        is_verify_email: true,
        password: await this.authService.generatePassword('P01ikyf0wii9'),
      });

      await this.sms.sendSms(phone_number, code);

      return {
        access_token: await this.authService.makeAccessToken({
          user_id: user?.id,
          email: user?.email,
          'https://hasura.io/jwt/claims': {
            'x-hasura-allowed-roles': ['user', 'admin'],
            'x-hasura-default-role': 'user',
            'x-hasura-role': 'user',
            'x-hasura-user-id': user?.id,
          },
        }),
        id: user.id,
      };
    }

    await this.UserRepository.update(userHoldActive.id, {
      code,
      user_name,
      full_name,
      login_type,
      is_verify_email: true,
    });

    await this.sms.sendSms(phone_number, code);

    return {
      access_token: await this.authService.makeAccessToken({
        user_id: userHoldActive?.id,
        email: userHoldActive?.email,
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': ['user', 'admin'],
          'x-hasura-default-role': 'user',
          'x-hasura-role': 'user',
          'x-hasura-user-id': userHoldActive?.id,
        },
      }),
      id: userHoldActive.id,
    };
  }

  @Post('forgot_password/email')
  async forgotPasswordByEmail(@Body() body: PayloadForgotByEmailWebHook): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const { email } = body.input;
    const code = this.gen.generate(MIN_GENERATE, MAX_GENERATE);
    const user = await this.UserRepository.findOne({
      email: email.toLowerCase(),
      is_verify_code: true,
      deleted_at: null,
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.login_type === 2) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'MAIL_USING_GOOGLE_REJECT_FORGOT',
          message: 'MAIL_USING_GOOGLE_REJECT_FORGOT',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.login_type === 3) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'MAIL_USING_APPLE_REJECT_FORGOT',
          message: 'MAIL_USING_APPLE_REJECT_FORGOT',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.UserRepository.update(`${user.id}`, {
      code,
    });

    await this.authService.sendMailConfirmCode(code, user.full_name, user.email);
    return {
      status: 'success',
    };
  }

  @Post('forgot_password/phone')
  async forgotPasswordByPhone(@Body() body: PayloadForgotByPhoneWebHook): Promise<{ status: string }> {
    //todo validate email and password req webhook

    const { phone_number } = body.input;

    const code = this.gen.generate(MIN_GENERATE, MAX_GENERATE);
    const user = await this.UserRepository.findOne({
      phone_number,
      is_verify_code: true,
      deleted_at: null,
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.login_type === 2) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'PHONE_USING_GOOGLE_REJECT_FORGOT',
          message: 'PHONE_USING_GOOGLE_REJECT_FORGOT',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.login_type === 3) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'PHONE_USING_APPLE_REJECT_FORGOT',
          message: 'PHONE_USING_APPLE_REJECT_FORGOT',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.UserRepository.update(`${user.id}`, {
      code,
    });

    await this.sms.sendSms(phone_number, code);

    return {
      status: 'success',
    };
  }

  @Post('verify_code/email')
  async verifyCodeByEmail(@Body() body: PayloadVerifyCodeEmailWebHook): Promise<{ status: string }> {
    //todo validate code
    const { email, code } = body.input;

    const userVerifyCode = await this.UserRepository.findOne({
      where: {
        code,
        email: email.toLowerCase(),
      },
    });

    if (!userVerifyCode) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'CODE_WRONG_OR_EMAIL_USING_CODE_WRONG',
          message: 'CODE_WRONG_OR_EMAIL_USING_CODE_WRONG',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.UserRepository.update(userVerifyCode.id, {
      is_verify_code: true,
    });

    return {
      status: 'success',
    };
  }

  @Post('verify_code/phone')
  async verifyCodeByPhone(@Body() body: PayloadVerifyCodePhoneWebHook): Promise<{ status: string }> {
    //todo validate code
    const { code, phone_number } = body.input;

    const userVerifyCode = await this.UserRepository.findOne({
      where: {
        code,
        phone_number,
      },
    });

    if (!userVerifyCode) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'CODE_WRONG_OR_PHONE_USING_CODE_WRONG',
          message: 'CODE_WRONG_OR_PHONE_USING_CODE_WRONG',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.UserRepository.update(userVerifyCode.id, {
      is_verify_code: true,
    });

    return {
      status: 'success',
    };
  }

  @Post('update_pass')
  async updatePasswordByPhone(@Body() body: PayloadUpdatePasswordWebHook): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const { type, password, condition } = body.input;

    if (type === TypeVerify.PHONE) {
      const userVerifyCode = await this.UserRepository.findOne({
        where: {
          phone_number: condition,
        },
      });

      if (!userVerifyCode) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'USER_NOT_FOUND',
            message: 'USER_NOT_FOUND',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.UserRepository.update(userVerifyCode.id, {
        password: await this.authService.generatePassword(password),
      });

      return {
        status: 'success',
      };
    }

    if (type === TypeVerify.EMAIL) {
      const userVerifyCode = await this.UserRepository.findOne({
        where: {
          email: condition.toLowerCase(),
        },
      });

      if (!userVerifyCode) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'USER_NOT_FOUND',
            message: 'USER_NOT_FOUND',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.UserRepository.update(userVerifyCode.id, {
        password: await this.authService.generatePassword(password),
      });

      return {
        status: 'success',
      };
    }
  }

  @Post('update_profile')
  async updateProfile(@Body() body: PayloadUpdateProfileWebHook, @Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook

    const { user_name } = body.input;

    if (user_name) {
      const entityManager = getManager();
      const userDbUserName = await entityManager.query(
        'SELECT u.user_name FROM users AS u WHERE LOWER(u.user_name) = $1 AND u.is_verify_code = $2 AND u.deleted_at is null and u.id != $3',
        [user_name.toLowerCase(), true, req.body.session_variables['x-hasura-user-id']],
      );

      if (userDbUserName.length > 0) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            error: 'THE_USER_NAME_HAS_ALREADY_BEEN_TAKEN',
            message: 'THE_USER_NAME_HAS_ALREADY_BEEN_TAKEN',
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    await this.UserRepository.update(`${req.body.session_variables['x-hasura-user-id']}`, {
      ...body.input,
    });

    return {
      status: 'success',
    };
  }

  @Post('change_password')
  async changePassword(@Body() body: PayloadChangePasswordWebHook, @Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const { old_password, password } = body.input;

    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
      login_type: 1,
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const isSamePassword = await this.authService.checkPassword(old_password, user);

    if (!isSamePassword) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'PASSWORD_WRONG',
          message: 'PASSWORD_WRONG',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.UserRepository.update(`${req.body.session_variables['x-hasura-user-id']}`, {
      password: await this.authService.generatePassword(password),
    });

    return {
      status: 'success',
    };
  }

  @Post('verify_password')
  async verifyPassword(@Body() body: PayloadVerifyPasswordWebHook, @Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const { password } = body.input;

    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const isSamePassword = await this.authService.checkPassword(password, user);

    if (!isSamePassword) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'PASSWORD_WRONG',
          message: 'PASSWORD_WRONG',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      status: 'success',
    };
  }

  @Post('profile')
  async getProfile(@Request() req): Promise<ProfileDto> {
    //todo validate email and password req webhook

    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      id: user.id,
      avatar: user.avatar,
      user_name: user.user_name,
      full_name: user.full_name,
      description: user.description,
      login_type: user.login_type,
      phone_number: user.phone_number,
      email: user.email,
      phone_code: user.phone_code,
      is_verify_email: user.is_verify_email,
    };
  }

  @Post('delete_user')
  async deleteUser(@Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook

    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.UserRepository.update(user.id, {
      deleted_at: new Date(),
    });

    return {
      status: 'success',
    };
  }

  @Post('update_info')
  async updateInfo(@Body() body: PayloadUpdateProfileWebHook, @Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook

    const { user_name } = body.input;

    if (user_name) {
      const userCheckName = await this.UserRepository.find({
        user_name,
        is_verify_code: true,
        deleted_at: null,
        id: Not(req.body.session_variables['x-hasura-user-id']),
      });

      if (userCheckName.length > 0) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            error: 'THE_USER_NAME_HAS_ALREADY_BEEN_TAKEN',
            message: 'THE_USER_NAME_HAS_ALREADY_BEEN_TAKEN',
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    await this.UserRepository.update(`${req.body.session_variables['x-hasura-user-id']}`, {
      ...body.input,
    });

    return {
      status: 'success',
    };
  }

  @Post('confirm_delete')
  async confirmDelete(@Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook

    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const code = this.gen.generate(MIN_GENERATE, MAX_GENERATE);

    const link = `${this.config.get('mail.verify_url')}/verify/verify_redirect_del_account?id=${
      user.id
    }&code_delete=${code}`;

    await this.UserRepository.update(user.id, {
      code_delete: code,
    });

    await this.authService.sendMailConfirmDel(user.email, user.full_name, link);

    return {
      status: 'success',
    };
  }

  @Post('resend_link')
  async resendLink(@Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook

    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const code = this.gen.generate(MIN_GENERATE, MAX_GENERATE);

    const link = `${this.config.get('mail.verify_url')}/verify/verify_redirect_del_account?id=${
      user.id
    }&code_delete=${code}`;

    await this.UserRepository.update(user.id, {
      code_delete: code,
    });

    await this.authService.sendMailConfirmDel(user.email, user.full_name, link);

    return {
      status: 'success',
    };
  }

  @Post('verify_callback_delete')
  async verifyCallBackDelAccount(@Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook

    const { id } = req.body.input;

    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.id !== id) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'LINK_VERIFY_DEL_ACCOUNT_WRONG',
          message: 'LINK_VERIFY_DEL_ACCOUNT_WRONG',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    await this.UserRepository.update(user.id, {
      deleted_at: new Date(),
    });

    return {
      status: 'success',
    };
  }

  @Get('verify_redirect_del_account')
  async verifyDelAccount(@Query() query): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const user = await this.UserRepository.findOne(query);

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'LINK_VERIFY_DEL_ACCOUNT_WRONG',
          message: 'LINK_VERIFY_DEL_ACCOUNT_WRONG',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await getConnection()
      .createQueryBuilder()
      .update(UserExchangesKeys)
      .delete()
      .where('user_id = :user_id', { user_id: query.id })
      .execute();

    await this.UserRepository.update(user.id, {
      deleted_at: new Date(),
    });

    return {
      status: 'success',
    };
  }

  @Post('delete_avatar')
  async deleteAvatar(@Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.UserRepository.update(user.id, {
      avatar: null,
    });

    return {
      status: 'success',
    };
  }

  @Post('update_profile_complete')
  async updateProfileComplete(@Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.UserRepository.update(user.id, {
      ...req.body.input,
    });

    return {
      status: 'success',
    };
  }

  @Post('verify_email_complete')
  async verifyEmailComplete(@Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const code = this.gen.generate(MIN_GENERATE, MAX_GENERATE);

    await this.UserRepository.update(user.id, {
      code_verify_email: code,
    });

    const link = `${this.config.get('mail.verify_url')}/verify/verify_redirect_email?id=${
      user.id
    }&code_verify_email=${code}`;

    await this.authService.sendMailVerifyComplete(user.email, user.full_name, link);

    return {
      status: 'success',
    };
  }

  @Post('resend_link_verify_email')
  async resendLinkVerifyEmail(@Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const code = this.gen.generate(MIN_GENERATE, MAX_GENERATE);
    await this.UserRepository.update(user.id, {
      code_verify_email: code,
    });

    const link = `${this.config.get('mail.verify_url')}/verify/verify_redirect_email?id=${
      user.id
    }&code_verify_email=${code}`;

    await this.authService.sendMailVerifyComplete(user.email, user.full_name, link);

    return {
      status: 'success',
    };
  }

  @Post('change_email')
  async changeEmail(@Body() body: PayloadChangeEmailWebhook, @Request() req): Promise<{ status: string }> {
    //todo validate email and password req webhook

    const { email } = body.input;

    const user = await this.UserRepository.findOne({
      id: req.body.session_variables['x-hasura-user-id'],
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'USER_NOT_FOUND',
          message: 'USER_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.email === email.toLowerCase()) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'THIS_EMAIL_HAS_BEEN_REGISTER_WITH_THIS_ACCOUNT',
          message: 'THIS_EMAIL_HAS_BEEN_REGISTER_WITH_THIS_ACCOUNT',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const userDbEmail = await this.UserRepository.find({
      where: [
        {
          email: email.toLowerCase(),
          is_verify_code: true,
          deleted_at: null,
          id: Not(user.id),
        },
      ],
    });

    if (userDbEmail?.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'THE_EMAIL_HAS_BEEN_REGISTERED',
          message: 'THE_EMAIL_HAS_BEEN_REGISTERED',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    await this.UserRepository.update(user.id, {
      email,
      is_verify_email: false,
    });

    return {
      status: 'success',
    };
  }

  @Get('verify_redirect_email')
  async verifyEmail(@Query() query): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const user = await this.UserRepository.findOne(query);

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'LINK_VERIFY_EMAIL_WRONG',
          message: 'LINK_VERIFY_EMAIL_WRONG',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.UserRepository.update(user.id, {
      is_verify_email: true,
    });

    return {
      status: 'success',
    };
  }

  @Post('worker_run')
  async workerRunDeleteAccount(@Request() req): Promise<any> {
    //todo validate email and password req webhook
    console.log('start run worker');

    const users = await this.UserRepository.find({
      where: {
        is_verify_email: false,
        expired_date: Raw((alias) => `${alias} < :date`, {
          date: moment()
            .subtract(parseInt(this.config.get('time.time_delete')), 'hours')
            .format('YYYY-MM-DD HH:mm:ss'),
        }),
      },
    });

    users?.length > 0 &&
      (await this.UserRepository.update(
        users?.map((item) => item.id),
        {
          deleted_at: new Date(),
        },
      ));

    return {
      status: 'success',
    };
  }

  @Post('generate')
  async generateKeyPem(): Promise<any> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'pkcs1',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: '',
      },
    });
    await writeFileSync('private.pem', privateKey);
    await writeFileSync('public.pem', publicKey);

    return {
      publicKey,
      privateKey,
    };
  }

  @Post('public_key')
  publicKey(): { key: string } {
    return {
      key: `${process.env.PUBLIC_KEY_PEM.replace(/\\n/gm, '\n')}`,
    };
  }

  @Post('encoded')
  enCoded(@Body() body: PayloadEncodeWebHook): { key: string } {
    const { text } = body.input;
    const key = this.Encrypt.encrypt(text);

    return {
      key,
    };
  }

  @Post('decoded')
  deCoded(@Body() body): string {
    return this.Encrypt.decrypt(body.text);
  }
}
