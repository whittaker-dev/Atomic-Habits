import type { ContactFormValues } from './contact-schema';
import { getApiUrl } from './api-url';

export async function submitContactForm(values: ContactFormValues): Promise<void> {
  const res = await fetch(getApiUrl('/contact'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    throw new Error('Contact submission failed');
  }
}
