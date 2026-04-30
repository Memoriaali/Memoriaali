import { DocPrivacySchema, DocumentSchema } from '@memoriaali/api-types/generated';
import { z } from 'zod';

/**
 * Schema for creating a new document
 */
export const CreateDocumentSchema = z
  .object({
    fileName: z.string().min(1, 'File name is required'),
    originalFileName: z.string().optional(),
    mimeType: z.string().optional(),
    documentPrivacy: DocPrivacySchema.default('PUBLIC'),
    groupToShare: z.string().uuid().optional(),
    metadata: z.record(z.string(), z.any()).default({}),
    aiModified: z.boolean().default(false),
    aiModifiedFields: z.array(z.string()).default([]),
    hasErrors: z.boolean().default(false),
    errorTypes: z.array(z.string()).default([]),
    errorPageNumbers: z.array(z.string()).default([]),
  })
  .refine((data) => !data.groupToShare || data.documentPrivacy === 'GROUP', {
    message: 'groupToShare can only be set if documentPrivacy is GROUP',
    path: ['groupToShare'],
  });

/**
 * Schema for updating an existing document
 */
export const UpdateDocumentSchema = z
  .object({
    fileName: z.string().min(1, 'File name is required').optional(),
    originalFileName: z.string().optional(),
    mimeType: z.string().optional(),
    documentPrivacy: DocPrivacySchema.optional(),
    groupToShare: z.string().uuid().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    aiModified: z.boolean().optional(),
    aiModifiedFields: z.record(z.string(), z.any()).optional(),
    hasErrors: z.boolean().optional(),
    errorTypes: z.array(z.string()).optional(),
    errorPageNumbers: z.array(z.string()).optional(),
  })
  .refine((data) => !data.groupToShare || data.documentPrivacy === 'GROUP', {
    message: 'groupToShare can only be set if documentPrivacy is GROUP',
    path: ['groupToShare'],
  });

/**
 * Schema for document query parameters
 */
export const DocumentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  noLimit: z.coerce.boolean().default(false),
  search: z.string().min(1).optional(),
  documentPrivacy: DocPrivacySchema.optional(),
  userId: z.string().uuid().optional(),
  //JJ
  groupId: z.string().uuid().optional(),
  mimeType: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Schema for document with comment count
 */
export const DocumentWithCommentCountSchema = DocumentSchema.extend({
  _count: z.object({
    comments: z.number(),
  }),
  user: z.object({
    id: z.string(),
    username: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
});

/**
 * Schema for document list response
 */
export const DocumentListResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    documents: z.array(DocumentWithCommentCountSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      pages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  }),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;
export type DocumentQueryInput = z.infer<typeof DocumentQuerySchema>;
export type DocumentListResponse = z.infer<typeof DocumentListResponseSchema>;
export type DocumentWithCommentCount = z.infer<typeof DocumentWithCommentCountSchema>;
