import { z } from 'zod';

/**
 * Oral history feature configuration schema
 */
export const OralHistoryConfigSchema = z.object({
  feature: z.literal('oralHistory'),
  config: z.object({
    enabled: z.boolean(),
  }),
});
