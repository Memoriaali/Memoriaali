import { VariantConfiguration } from '../schemas/variant-schema';
import { PartialVariantConfiguration } from '../types/variant';
import { mergeFeatures } from './mergeFeatures';

/**
 * Helper to merge variant configurations
 */
export const mergeVariantConfigurations = (
  base: VariantConfiguration,
  override: PartialVariantConfiguration,
): VariantConfiguration => {
  const merged: VariantConfiguration = {
    ...base,
    ...override,
    organization: {
      ...base.organization,
      ...(override.organization ?? {}),
    },
    localization: {
      ...base.localization,
      ...(override.localization ?? {}),
    },
    security: {
      ...base.security,
      ...(override.security ?? {}),
    },
    features: mergeFeatures(base.features, override.features as VariantConfiguration['features']),
    metadata: {
      ...base.metadata,
      ...(override.metadata ?? {}),
    },
  };
  return merged;
};
