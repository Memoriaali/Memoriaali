import { z } from 'zod';

/**
 * OCR feature configuration schema
 */
export const OCRConfigSchema = z.object({
  feature: z.literal('ocr'),
  config: z.object({
    maxFile: z.string().regex(/^\d+[KMG]B$/),
    allowedFormats: z.array(z.string()),
  }),
});
