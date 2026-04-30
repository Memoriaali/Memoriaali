import { z } from 'zod';

/**
 * File upload request schema
 *
 * Validates multipart form data for file uploads
 */
export const FileUploadSchema = z.object({
  files: z
    .array(
      z.object({
        fieldname: z.string(),
        originalname: z.string(),
        encoding: z.string(),
        mimetype: z.string(),
        size: z.number().positive(),
        destination: z.string(),
        filename: z.string(),
        path: z.string(),
      }),
    )
    .min(1, 'At least one file is required'),
});

/**
 * File upload response schema
 *
 * Defines the structure of successful file upload responses
 */
export const FileUploadResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    uploadedFiles: z.array(
      z.object({
        originalName: z.string(),
        filename: z.string(),
        mimeType: z.string(),
        size: z.number(),
        path: z.string(),
        uploadedAt: z.date(),
      }),
    ),
    totalFiles: z.number(),
    totalSize: z.number(),
  }),
  message: z.string(),
});

/**
 * File upload error response schema
 *
 * Defines the structure of file upload error responses
 */
export const FileUploadErrorSchema = z.object({
  status: z.literal('error'),
  error: z.string(),
  details: z.string().optional(),
});

/**
 * Type definitions derived from schemas
 */
export type FileUploadRequest = z.infer<typeof FileUploadSchema>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export type FileUploadError = z.infer<typeof FileUploadErrorSchema>;
export type UploadedFile = z.infer<typeof FileUploadResponseSchema>['data']['uploadedFiles'][0];
