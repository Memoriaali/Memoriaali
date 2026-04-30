import { z } from 'zod';

/**
 * Comments feature configuration schema
 */
export const CommentsConfigSchema = z.object({
  feature: z.literal('comments'),
  config: z.object({
    allowAnonymous: z.boolean(),
    requireModeration: z.boolean(),
    maxLength: z.number().min(1).max(100000),
    allowReplies: z.boolean(),
    allowEditing: z.boolean(),
    editTimeLimit: z.number().min(0).optional(), // Minutes
  }),
});
