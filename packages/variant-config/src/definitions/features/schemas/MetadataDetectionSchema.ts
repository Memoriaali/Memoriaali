import { z } from 'zod';

/**
 * Metadata Detection feature configuration schema
 */
export const MetadataDetectionConfigSchema = z.object({
  feature: z.literal('metadataDetection'),
  config: z.object({
    api: z.string(),
    annif: z.boolean(),
    gpe: z.boolean(),
    date: z.boolean(),
    name: z.boolean(),
    act: z.boolean(),
    y_field: z.boolean(),
    diar: z.boolean(),
    product: z.boolean(),
    event: z.boolean(),
    norp: z.boolean(),
  }),
});
