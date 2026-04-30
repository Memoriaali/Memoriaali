import { z } from 'zod';

/**
 * SIP feature configuration schema
 */
export const SipConfigSchema = z.object({
  feature: z.literal('sip'),
  config: z.object({
    enabled: z.boolean(),
  }),
});
