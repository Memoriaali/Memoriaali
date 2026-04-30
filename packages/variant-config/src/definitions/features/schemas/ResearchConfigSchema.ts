import { z } from 'zod';

/**
 * Research feature configuration schema
 */
export const ResearchConfigSchema = z.object({
  feature: z.literal('research'),
  config: z.object({
    requestTypes: z.array(z.string()),
    maxRequestsPerUser: z.number().min(1).max(1000),
    allowAnonymousRequests: z.boolean(),
    responseTimeLimit: z.number().min(1).max(365), // Days
  }),
});
