import nodemailer from 'nodemailer';
import type IMailer from './interface.js';
import type { IDataSendMail } from './interface.js';

class Mailer implements IMailer {
  async sendMail({ message, subject, to, text = '' }: IDataSendMail): Promise<string> {
    const user = process.env.USER_MAIL;
    const pass = process.env.MAIL_PASSWORD;

    if (!user || !pass) {
      throw new Error('Mail credentials are not configured');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: user,
      to,
      subject,
      text,
      html: message,
    });

    return info.response;
  }
}

export default new Mailer();
