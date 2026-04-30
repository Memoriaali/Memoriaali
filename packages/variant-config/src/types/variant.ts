/**
 * Main variant configuration type that combines all aspects of a variant.
 */

import cloneDeep from 'lodash/cloneDeep';
import mergeWith from 'lodash/mergeWith';
import type { VariantConfiguration } from '../schemas/variant-schema';

/**
 * Partial variant configuration for overrides
 */
export type PartialVariantConfiguration = {
  [K in keyof VariantConfiguration]?: K extends 'features'
    ? VariantConfiguration['features']
    : K extends 'permissions'
      ? VariantConfiguration[K]
      : Partial<VariantConfiguration[K]>;
};

/**
 * Type to extract enabled features from a variant configuration
 */
export type EnabledFeatures<T extends VariantConfiguration> = T['features'][number]['feature'];

/**
 * Merge variant configurations with proper deep merging
 */
export const mergeVariantConfigurations = (
  base: VariantConfiguration,
  ...overrides: PartialVariantConfiguration[]
): VariantConfiguration => {
  const result = cloneDeep(base) as VariantConfiguration;

  const overwriteArrays = (objValue: unknown, srcValue: unknown): unknown => {
    if (Array.isArray(objValue) && Array.isArray(srcValue)) {
      return srcValue;
    }
    return undefined;
  };

  for (const override of overrides) {
    if (!override) {
      continue;
    }

    // Replace features completely if provided
    if (override.features) {
      result.features = override.features as VariantConfiguration['features'];
    }

    // Merge all other properties with deep merge and array overwrite
    const variantKeys = Object.keys(override) as (keyof VariantConfiguration)[];
    const rest: Partial<VariantConfiguration> = {};

    for (const key of variantKeys) {
      if (key === 'features') {
        continue;
      }
      const value = override[key];
      if (value === null) {
        // Explicitly handle null to remove the key from result
        delete (result as any)[key];
      } else if (value !== undefined) {
        (rest as Record<keyof VariantConfiguration, unknown>)[key] = value as unknown;
      }
    }

    mergeWith(result, rest, overwriteArrays);
  }

  return result;
};
