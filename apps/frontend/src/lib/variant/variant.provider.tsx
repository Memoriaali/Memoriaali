'use client';

/**
 * Client-side Variant Provider Component
 *
 * This provider receives the variant configuration from the server
 * and provides it to all client components through React context.
 */

import type {
  ExtractFeatureConfig,
  FeatureConfiguration,
  FeatureId,
  PublicVariantConfiguration,
} from '@memoriaali/variant-config';
import React, { createContext, useMemo } from 'react';

export interface VariantContextValue {
  configuration: PublicVariantConfiguration;
  hasFeature: (_featureId: FeatureId) => boolean;
  getFeature: <T extends FeatureId>(_featureId: T) => ExtractFeatureConfig<T> | null;
}

export const VariantContext = createContext<VariantContextValue | undefined>(undefined);

interface VariantProviderProps {
  children: React.ReactNode;
  configuration: PublicVariantConfiguration;
}

/**
 * Variant Configuration Provider
 *
 * This provider receives the configuration from the server component
 * and provides it to all child components through context.
 */
export const VariantProvider = ({ children, configuration }: VariantProviderProps) => {
  // Memoize the context value to avoid unnecessary re-renders
  const value = useMemo(() => {
    const hasFeature = (featureId: FeatureId): boolean => {
      const feature = configuration.features.find(
        (f: FeatureConfiguration) => f.feature === featureId,
      );
      return !!feature;
    };

    const getFeature = <T extends FeatureId>(featureId: T): ExtractFeatureConfig<T> | null => {
      const feature = configuration.features.find(
        (f: FeatureConfiguration) => f.feature === featureId,
      );
      return (feature as ExtractFeatureConfig<T>) ?? null;
    };

    return {
      configuration,
      hasFeature,
      getFeature,
    };
  }, [configuration]);

  return <VariantContext.Provider value={value}>{children}</VariantContext.Provider>;
};
