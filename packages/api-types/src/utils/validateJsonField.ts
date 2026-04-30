// =============================================
// COMMON VALIDATION UTILITIES
// =============================================
/**
 * Generic JSON validation with comprehensive error handling
 *
 * Preconditions: schema is a valid Zod schema, data is any unknown value
 * Postconditions: returns success/error result with data or error details
 * Invariants: input data and schema are not mutated
 *
 * @param schema - Zod schema to validate against
 * @param data - Unknown data to validate
 * @returns Validation result with success flag and data or errors
 */
export const validateJsonField = <T>(
  schema: import('zod').ZodSchema<T>,
  data: unknown,
): { success: boolean; data?: T; errors?: import('zod').ZodError } => {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
};
