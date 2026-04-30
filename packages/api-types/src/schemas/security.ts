import { z } from 'zod';

export const PasswordSchema = z
  .string()
  .min(8, 'New password must be at least 8 characters')
  .max(128, 'New password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'New password must contain uppercase, lowercase, and number',
  );
