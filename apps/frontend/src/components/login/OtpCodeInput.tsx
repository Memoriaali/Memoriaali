'use client';

import React, { useEffect, useMemo, useRef } from 'react';

type OtpCodeInputProps = {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  name?: string;
  'aria-labelledby'?: string;
  className?: string;
  inputClassName?: string;
};

export default function OtpCodeInput({
  length = 6,
  value,
  onChange,
  autoFocus,
  disabled,
  invalid,
  name,
  className,
  inputClassName,
  'aria-labelledby': ariaLabelledby,
}: OtpCodeInputProps) {
  const digits = useMemo(() => (value ?? '').slice(0, length).split(''), [value, length]);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
      inputsRef.current[0].select?.();
    }
  }, [autoFocus]);

  const clampDigit = (ch: string) => (/[0-9]/.test(ch) ? ch : '');

  const handleChange = (idx: number, ch: string) => {
    const d = clampDigit(ch);
    if (!d) return;

    const current = Array.from({ length }, (_, i) => digits[i] ?? '');
    current[idx] = d;
    const next = current.join('').slice(0, length);
    onChange(next);

    const nextIdx = Math.min(idx + 1, length - 1);
    inputsRef.current[nextIdx]?.focus();
    inputsRef.current[nextIdx]?.select?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    const { key, ctrlKey, metaKey } = e;

    if ((ctrlKey || metaKey) && ['v', 'c', 'x', 'a'].includes(key.toLowerCase())) {
      return;
    }

    if (key === 'Backspace' || key === 'Delete') {
      e.preventDefault();
      const current = Array.from({ length }, (_, i) => digits[i] ?? '');

      if (key === 'Backspace') {
        const prevIdx = Math.max(idx - 1, 0);
        current[prevIdx] = '';
        const next = current.join('').slice(0, length);
        onChange(next);
        inputsRef.current[prevIdx]?.focus();
        inputsRef.current[prevIdx]?.select?.();
      } else {
        current[idx] = '';
        const next = current.join('').slice(0, length);
        onChange(next);
        inputsRef.current[idx]?.focus();
        inputsRef.current[idx]?.select?.();
      }
      return;
    }

    if (key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = Math.max(idx - 1, 0);
      inputsRef.current[prevIdx]?.focus();
      inputsRef.current[prevIdx]?.select?.();
      return;
    }

    if (key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = Math.min(idx + 1, length - 1);
      inputsRef.current[nextIdx]?.focus();
      inputsRef.current[nextIdx]?.select?.();
      return;
    }

    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      handleChange(idx, key);
      return;
    }

    if (key.length === 1 && !/^[0-9]$/.test(key)) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, idx: number) => {
    e.preventDefault();

    const raw = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text') || '';

    const maxFill = length - idx;
    const digitsOnly = raw.replace(/[^0-9]/g, '').slice(0, maxFill);
    if (!digitsOnly) return;

    const current = Array.from({ length }, (_, i) => digits[i] ?? '');

    let writeIdx = idx;
    for (const ch of digitsOnly) {
      if (writeIdx >= length) break;
      current[writeIdx] = ch;
      writeIdx++;
    }

    const next = current.join('').slice(0, length);
    onChange(next);

    const focusIdx = Math.min(writeIdx - 1, length - 1);
    inputsRef.current[focusIdx]?.focus();
    inputsRef.current[focusIdx]?.select?.();
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.select?.();
  };

  return (
    <div
      role='group'
      aria-labelledby={ariaLabelledby}
      className={className}
      style={{ display: 'flex', gap: '0.5rem' }}
    >
      {Array.from({ length }).map((_, idx) => {
        const char = digits[idx] ?? '';
        return (
          <input
            key={idx}
            ref={(el) => {
              inputsRef.current[idx] = el;
            }}
            type='text'
            inputMode='numeric'
            pattern='[0-9]*'
            autoComplete={name ? `${name}-${idx}` : 'one-time-code'}
            name={name ? `${name}-${idx}` : undefined}
            value={char}
            onChange={(e) => {
              const ch = e.target.value.slice(-1);
              handleChange(idx, ch);
            }}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={(e) => handlePaste(e, idx)}
            onFocus={handleFocus}
            aria-label={`Koodin merkki ${idx + 1}`}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            maxLength={1}
            className={inputClassName}
            style={{
              width: '3rem',
              height: '3rem',
              textAlign: 'center',
              fontSize: '1.25rem',
              lineHeight: '3rem',
              border: '1px solid var(--bs-border-color, #ced4da)',
              borderRadius: '0.375rem',
            }}
          />
        );
      })}
    </div>
  );
}
