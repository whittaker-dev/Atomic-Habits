export interface IDataSendMail {
  to: string;
  subject: string;
  text?: string;
  message: string;
}

export default interface IMailer {
  sendMail: (data: IDataSendMail) => Promise<string>;
}
