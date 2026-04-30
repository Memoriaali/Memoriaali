/**
 * Validates any JSON field with the provided schema (throws on error)
 *
 * Preconditions: schema is a valid Zod schema, data is any unknown value
 * Postconditions: returns validated data or throws ZodError
 * Invariants: input data and schema are not mutated
 *
 * @param schema - Zod schema to validate against
 * @param data - Unknown data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 */
export const parseJsonField = <T>(schema: import('zod').ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};
