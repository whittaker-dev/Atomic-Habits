import type { AuthMeResponse, AuthUser, RegisterResponse } from '@atomic-habits/shared';
import { getApiUrl } from './api-url';

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body.message ?? 'Request failed';
  } catch {
    return 'Request failed';
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const res = await fetch(getApiUrl('/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return res.json() as Promise<RegisterResponse>;
}

export async function verifyRegistration(email: string, code: string): Promise<AuthUser> {
  const res = await fetch(getApiUrl('/auth/register/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, code }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  const body = (await res.json()) as { user: AuthUser };
  return body.user;
}

export async function resendRegistrationCode(email: string): Promise<void> {
  const res = await fetch(getApiUrl('/auth/register/resend'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
}

export async function logout(): Promise<void> {
  const res = await fetch(getApiUrl('/auth/logout'), {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch(getApiUrl('/auth/me'), {
    credentials: 'include',
  });

  if (res.status === 401) {
    return null;
  }

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  const body = (await res.json()) as AuthMeResponse;
  return body.user;
}
