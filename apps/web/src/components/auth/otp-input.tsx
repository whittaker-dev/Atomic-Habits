'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

const DIGIT_COUNT = 6;

export function OtpInput({
  value,
  onChange,
  disabled,
  id,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const digits = Array.from({ length: DIGIT_COUNT }, (_, index) => value[index] ?? '');

  function updateDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join('').slice(0, DIGIT_COUNT));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    updateDigit(index, digit);
    if (digit && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      updateDigit(index - 1, '');
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, DIGIT_COUNT - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  return (
    <div
      id={id}
      className="flex justify-center gap-sm"
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event.key)}
          onPaste={handlePaste}
          className={cn(
            'h-12 w-10 rounded-md border border-hairline bg-surface-1 text-center font-mono text-headline text-ink',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
            focusedIndex === index && 'border-primary',
            disabled && 'opacity-50',
          )}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
