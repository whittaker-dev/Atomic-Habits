import { apiClient, getErrorMessage } from './api-client';
import type { ContactFormValues } from './contact-schema';

export async function submitContactForm(values: ContactFormValues): Promise<void> {
  try {
    await apiClient.post('/contact', values);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
