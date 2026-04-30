import cloneDeep from 'lodash/cloneDeep';
import merge from 'lodash/merge';
import type { VariantConfiguration } from '../schemas/variant-schema';

/**
 * Merge features from base and override
 * @param base base features
 * @param override override features, if the same feature is defined in both,
 *                 the override will make a deep merge of the feature
 * @returns merged features
 */
type FeatureArray = VariantConfiguration['features'];
type FeatureItem = FeatureArray[number];

export const mergeFeatures = (
  base: FeatureArray,
  override: FeatureArray | undefined,
): FeatureArray => {
  if (!override) {
    return cloneDeep(base);
  }

  // Create a map of override features for efficient lookup
  const overrideMap = new Map(override.map((feature) => [feature.feature, feature]));

  // Start with deep cloned base features to avoid mutation
  const result = cloneDeep(base) as FeatureArray;

  // Deep merge each feature with its override if it exists
  (result as FeatureItem[]).forEach((feature, index) => {
    const overrideFeature = overrideMap.get(feature.feature);
    if (overrideFeature) {
      result[index] = merge({}, feature, overrideFeature);
    }
  });

  // Add any new features from override that don't exist in base
  override.forEach((overrideFeature) => {
    const existsInBase = base.some(
      (baseFeature) => baseFeature.feature === overrideFeature.feature,
    );
    if (!existsInBase) {
      (result as FeatureItem[]).push(cloneDeep(overrideFeature));
    }
  });

  return result;
};
