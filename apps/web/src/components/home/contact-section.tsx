'use client';

import { useGSAP } from '@gsap/react';
import { zodResolver } from '@hookform/resolvers/zod';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/button';
import { TextInput } from '@/design-system/components/input';
import { createContactSchema, type ContactFormValues } from '@/lib/contact-schema';
import { submitContactForm } from '@/lib/contact-api';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

const ctaMotion = {
  whileHover: { scale: 1.03, y: -1 },
  whileTap: { scale: 0.98 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 22 },
};

function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-[120px] w-full resize-y rounded-md border border-hairline bg-surface-1 px-sm py-xs',
        'font-sans text-body text-ink placeholder:text-ink-tertiary',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
        className,
      )}
      {...props}
    />
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <motion.p
      id={id}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-xs font-sans text-body-sm text-error"
      role="alert"
    >
      {message}
    </motion.p>
  );
}

function ContactForm() {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>(
    'idle',
  );
  const { t } = useTranslation();

  const contactSchema = useMemo(() => createContactSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', message: '' },
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitStatus('submitting');
    try {
      await submitContactForm(values);
      setSubmitStatus('success');
      reset();
    } catch {
      setSubmitStatus('error');
    }
  });

  return (
    <motion.form
      data-contact-reveal
      className="panel-lift mx-auto mt-xl max-w-xl space-y-lg rounded-lg bg-surface-1 p-lg md:p-xl"
      onSubmit={onSubmit}
      noValidate
    >
      <div>
        <label
          htmlFor="contact-name"
          className="mb-xs block font-sans text-body-sm text-ink-subtle"
        >
          {t('contact.fields.name')}
        </label>
        <TextInput
          id="contact-name"
          placeholder={t('contact.placeholders.name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'contact-name-error' : undefined}
          {...register('name')}
          autoComplete="name"
        />
        <FieldError id="contact-name-error" message={errors.name?.message} />
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="mb-xs block font-sans text-body-sm text-ink-subtle"
        >
          {t('contact.fields.email')}
        </label>
        <TextInput
          id="contact-email"
          type="email"
          placeholder={t('contact.placeholders.email')}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'contact-email-error' : undefined}
          {...register('email')}
          autoComplete="email"
        />
        <FieldError id="contact-email-error" message={errors.email?.message} />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-xs block font-sans text-body-sm text-ink-subtle"
        >
          {t('contact.fields.message')}
        </label>
        <TextArea
          id="contact-message"
          placeholder={t('contact.placeholders.message')}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'contact-message-error' : undefined}
          {...register('message')}
        />
        <FieldError id="contact-message-error" message={errors.message?.message} />
      </div>

      {submitStatus === 'success' && (
        <motion.p
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-sans text-body-sm text-success"
          role="status"
        >
          {t('contact.success')}
        </motion.p>
      )}

      {submitStatus === 'error' && (
        <motion.p
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-sans text-body-sm text-error"
          role="alert"
        >
          {t('contact.error')}
        </motion.p>
      )}

      <motion.div {...ctaMotion} className="flex flex-wrap gap-md">
        <Button type="submit" disabled={submitStatus === 'submitting'}>
          {submitStatus === 'submitting'
            ? t('common.actions.sending')
            : t('common.actions.sendMessage')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            reset();
            setSubmitStatus('idle');
          }}
        >
          {t('common.actions.clear')}
        </Button>
      </motion.div>
    </motion.form>
  );
}

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { t, i18n } = useTranslation();

  useGSAP(
    () => {
      const el = sectionRef.current;
      if (!el) return;

      gsap.from(el.querySelectorAll('[data-contact-reveal]'), {
        scrollTrigger: { trigger: el, start: 'top 78%', toggleActions: 'play none none reverse' },
        y: 48,
        opacity: 0,
        stagger: 0.12,
        duration: 0.85,
        ease: 'power3.out',
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="scroll-mt-24 border-t border-hairline py-section"
    >
      <div className="container-content">
        <div data-contact-reveal className="text-center">
          <p className="font-sans text-headline font-bold text-primary">{t('contact.label')}</p>
          <h2 className="mt-md font-sans text-display-md font-bold md:text-display-lg lg:text-display-xl">
            {t('contact.title')}
          </h2>
          <p className="mx-auto mt-lg max-w-2xl font-sans text-body-lg text-ink-muted">
            {t('contact.subtitle')}
          </p>
        </div>

        <ContactForm key={i18n.language} />
      </div>
    </section>
  );
}
