import { Resend } from 'resend';
import type IMailer from './interface.js';
import type { IDataSendMail } from './interface.js';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

function resolveRecipient(to: string): { recipient: string; subjectPrefix: string } {
  const overrideTo = process.env.RESEND_TO?.trim();
  if (overrideTo && overrideTo !== to) {
    return { recipient: overrideTo, subjectPrefix: `[for: ${to}] ` };
  }

  return { recipient: to, subjectPrefix: '' };
}

class Mailer implements IMailer {
  async sendMail({ message, subject, to, text = '' }: IDataSendMail): Promise<string> {
    const from = process.env.RESEND_FROM;
    if (!from) {
      throw new Error('RESEND_FROM is not configured');
    }

    const { recipient, subjectPrefix } = resolveRecipient(to);

    const { data, error } = await getResendClient().emails.send({
      from,
      to: [recipient],
      subject: `${subjectPrefix}${subject}`,
      html: message,
      text: text || undefined,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data?.id ?? 'sent';
  }
}

export default new Mailer();
