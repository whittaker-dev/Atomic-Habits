import { createHash, randomInt } from 'node:crypto';

export function generateOtpCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function hashOtpCode(code: string): string {
  const secret = process.env.SESSION_SECRET ?? 'dev-secret';
  return createHash('sha256').update(`${code}:${secret}`).digest('hex');
}

export function verifyOtpCode(code: string, codeHash: string): boolean {
  return hashOtpCode(code) === codeHash;
}
