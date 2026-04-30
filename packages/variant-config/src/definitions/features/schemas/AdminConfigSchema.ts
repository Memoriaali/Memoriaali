import { z } from 'zod';

/**
 * Admin feature configuration schema
 */
export const AdminConfigSchema = z.object({
  feature: z.literal('admin'),
  config: z.object({
    enableAuditLog: z.boolean(),
  }),
});
