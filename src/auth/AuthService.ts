import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Hasher } from '../bcrypt/Hasher';
import Credentials from '../../entities/Credential';
import User from '../../entities/User';
import { PayloadJwt } from '../../resources';
import { ConfigService } from '@nestjs/config';
import { SendGridService } from '@anchan828/nest-sendgrid';

@Injectable()
export class AuthService {
  @Inject()
  private readonly jwtService: JwtService;

  @Inject()
  private readonly sendGrid: SendGridService;

  @Inject()
  private readonly config: ConfigService;

  @Inject('Hasher')
  private readonly hasher: Hasher;

  async checkPassword(plainPassword: string, userInfo: User): Promise<boolean> {
    return await this.hasher.compare(plainPassword, userInfo.password);
  }

  async makeAccessToken(credential: PayloadJwt): Promise<string> {
    return this.jwtService.sign(credential, {
      expiresIn: this.config.get('jwt.options.expiresIn'),
    });
  }

  async generatePassword(password: string): Promise<string> {
    return await this.hasher.generate(password);
  }

  async sendMailConfirmCode(code: string, name: string, email: string): Promise<any> {
    const emailSr = {
      to: email,
      from: this.config.get('mail.mail_user'),
      subject: 'FLOCK TRADE',
      template_id: this.config.get('mail.template_resend'),
      dynamic_template_data: {
        code,
        subject: 'FLOCK TRADE',
        name,
      },
    };
    await this.sendGrid.send(emailSr);
  }

  async sendMailVerifyComplete(email: string, name: string, link: string): Promise<any> {
    const emailSr = {
      to: email,
      from: this.config.get('mail.mail_user'),
      subject: 'FLOCK TRADE',
      template_id: this.config.get('mail.template_send_verify_email'),
      dynamic_template_data: {
        link,
        subject: 'VERIFY EMAIL ACCOUNT',
        name,
      },
    };
    await this.sendGrid.send(emailSr);
  }

  async sendMailConfirmDel(email: string, name: string, link: string): Promise<any> {
    const emailSr = {
      to: email,
      from: this.config.get('mail.mail_user'),
      subject: 'FLOCK TRADE',
      template_id: this.config.get('mail.template_send_link_del'),
      dynamic_template_data: {
        link,
        subject: 'VERIFY DELETE ACCOUNT',
        name,
      },
    };
    await this.sendGrid.send(emailSr);
  }
}
