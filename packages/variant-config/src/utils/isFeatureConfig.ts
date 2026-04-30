import type {
  ExtractFeatureConfig,
  FeatureConfiguration,
  FeatureId,
} from '../definitions/features';

/**
 * Type guard to check if a configuration is for a specific feature
 */

export const isFeatureConfig = <T extends FeatureId>(
  config: FeatureConfiguration,
  feature: T,
): config is ExtractFeatureConfig<T> => {
  return config.feature === feature;
};
