import { validateJsonField } from './validateJsonField';

/**
 * Batch validates multiple JSON fields with comprehensive error reporting
 *
 * Preconditions: validations array contains valid schema/data pairs
 * Postconditions: returns overall success and individual validation results
 * Invariants: input data is not mutated, all validations are attempted
 *
 * @param validations - Array of validation configurations
 * @returns Batch validation results with success flags and data/errors
 */
export const batchValidateJsonFields = (
  validations: Array<{
    name: string;
    schema: import('zod').ZodSchema<any>;
    data: unknown;
  }>,
): {
  success: boolean;
  results: Array<{
    name: string;
    success: boolean;
    data?: any;
    errors?: import('zod').ZodError | undefined;
  }>;
} => {
  const results = validations.map(({ name, schema, data }) => {
    const validationResult = validateJsonField(schema, data);

    if (validationResult.success) {
      return {
        name,
        success: true,
        data: validationResult.data,
        errors: undefined,
      };
    }

    return {
      name,
      success: false,
      data: undefined,
      errors: validationResult.errors,
    };
  });

  const overallSuccess = results.every((result) => result.success);

  return {
    success: overallSuccess,
    results,
  };
};
