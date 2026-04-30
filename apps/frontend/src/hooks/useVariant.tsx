'use client';
import type {
  ExtractFeatureConfig,
  FeatureId,
  PublicVariantConfiguration,
} from '@memoriaali/variant-config';
import { useContext } from 'react';
import { VariantContext, type VariantContextValue } from '../lib/variant/variant.provider';

/**
 * Hook to use variant configuration
 *
 * @returns Variant configuration context value
 * @throws Error if used outside of VariantProvider
 */

export const useVariant = (): VariantContextValue => {
  const context = useContext(VariantContext);

  if (!context) {
    throw new Error('useVariant must be used within a VariantProvider');
  }

  return context;
};

export const useOrganization = (): PublicVariantConfiguration['organization'] | undefined => {
  const { configuration } = useVariant();
  return configuration?.organization;
};

export const useLocalization = (): PublicVariantConfiguration['localization'] | undefined => {
  const { configuration } = useVariant();
  return configuration?.localization;
};

export const useFeature = (featureId: FeatureId): boolean => {
  const { hasFeature } = useVariant();
  return hasFeature(featureId);
};

export const useFeatureConfig = <T extends FeatureId>(
  featureId: T,
): ExtractFeatureConfig<T> | null => {
  const { getFeature } = useVariant();
  return getFeature(featureId);
};
