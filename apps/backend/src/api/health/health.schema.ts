import { z } from 'zod';

// Health check response schema
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string().datetime(),
  services: z.object({
    database: z.object({
      status: z.enum(['connected', 'disconnected']),
      userCount: z.number().optional(),
      responseTime: z.number().optional(),
    }),
    fileSystem: z
      .object({
        status: z.enum(['available', 'unavailable']),
        freeSpace: z.string().optional(),
      })
      .optional(),
  }),
  version: z.string().optional(),
  uptime: z.number().optional(),
});

// Database health check schema
export const DatabaseHealthSchema = z.object({
  status: z.enum(['connected', 'disconnected']),
  userCount: z.number(),
  responseTime: z.number(),
  lastChecked: z.string().datetime(),
});

// System health check schema
export const SystemHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  uptime: z.number(),
  memoryUsage: z.object({
    used: z.number(),
    total: z.number(),
    percentage: z.number(),
  }),
  version: z.string(),
});

// Export TypeScript types
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type DatabaseHealth = z.infer<typeof DatabaseHealthSchema>;
export type SystemHealth = z.infer<typeof SystemHealthSchema>;
