import { z } from 'zod';
import { emailField, otpCodeField, passwordField } from './common.js';

export const registerBodySchema = z.object({
  email: emailField,
  password: passwordField,
});

export const registerVerifyBodySchema = z.object({
  email: emailField,
  code: otpCodeField,
});

export const registerResendBodySchema = z.object({
  email: emailField,
});

export const loginBodySchema = z.object({
  email: emailField,
  password: passwordField,
});

export const loginVerifyBodySchema = z.object({
  email: emailField,
  code: otpCodeField,
});

export const loginResendBodySchema = z.object({
  email: emailField,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type RegisterVerifyBody = z.infer<typeof registerVerifyBodySchema>;
export type RegisterResendBody = z.infer<typeof registerResendBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type LoginVerifyBody = z.infer<typeof loginVerifyBodySchema>;
export type LoginResendBody = z.infer<typeof loginResendBodySchema>;
