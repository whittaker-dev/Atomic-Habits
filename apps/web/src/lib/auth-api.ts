import type { AuthMeResponse, AuthUser, RegisterResponse } from '@atomic-habits/shared';
import { isAxiosError } from 'axios';
import { apiClient, getErrorMessage } from './api-client';

export async function registerWithEmail(
  email: string,
  password: string,
): Promise<RegisterResponse> {
  try {
    const { data } = await apiClient.post<RegisterResponse>('/auth/register', { email, password });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function verifyRegistration(email: string, code: string): Promise<AuthUser> {
  try {
    const { data } = await apiClient.post<{ user: AuthUser }>('/auth/register/verify', {
      email,
      code,
    });
    return data.user;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function resendRegistrationCode(email: string): Promise<void> {
  try {
    await apiClient.post('/auth/register/resend', { email });
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await apiClient.get<AuthMeResponse>('/auth/me');
    return data.user;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw new Error(getErrorMessage(error));
  }
}
