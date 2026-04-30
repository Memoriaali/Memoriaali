/**
 * Creates a type-safe JSON field validator with multiple validation methods
 *
 * Preconditions: schema is a valid Zod schema
 * Postconditions: returns validator object with sync and async methods
 * Invariants: schema is not mutated, all methods are type-safe
 *
 * @param schema - Zod schema to create validator for
 * @returns Validator object with multiple validation methods
 */
export const createJsonValidator = <T>(schema: import('zod').ZodSchema<T>) => {
  return {
    validate: (data: unknown) => schema.parse(data),
    safeParse: (data: unknown) => schema.safeParse(data),
    validateAsync: (data: unknown) => schema.parseAsync(data),
  };
};
