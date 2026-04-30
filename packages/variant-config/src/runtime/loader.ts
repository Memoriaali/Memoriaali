/**
 * Configuration loader for variant configurations.
 * Works in both frontend and backend environments.
 */

import type { ExtractFeatureConfig, FeatureId } from '../definitions/features';
import {
  extractPublicVariantConfiguration,
  validateVariantConfiguration,
  type PublicVariantConfiguration,
  type VariantConfiguration,
} from '../schemas/variant-schema';

import { VariantId, getVariant } from '../../variants';
/**
 * Configuration loader singleton
 */
export class VariantConfigLoader {
  private static instance: VariantConfigLoader | null = null;
  private configuration: VariantConfiguration | null = null;
  private publicConfiguration: PublicVariantConfiguration | null = null;
  private variantId: string | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): VariantConfigLoader {
    if (!VariantConfigLoader.instance) {
      VariantConfigLoader.instance = new VariantConfigLoader();
    }
    return VariantConfigLoader.instance;
  }

  /**
   * Load configuration from various sources
   */
  private loadConfiguration = (): VariantConfiguration => {
    // Determine variant ID from environment or parameter
    const resolvedVariantId = this.resolveVariantId();

    // If already loaded for this variant, return cached
    if (this.configuration && this.variantId === resolvedVariantId) {
      return this.configuration;
    }

    try {
      // Try different loading strategies based on environment
      const config: VariantConfiguration = this.loadVariant(resolvedVariantId);

      // Cache the configuration
      this.configuration = validateVariantConfiguration(config);
      // TODO: Add validation here
      this.configuration = config;
      this.publicConfiguration = extractPublicVariantConfiguration(config);
      this.variantId = resolvedVariantId;

      return this.configuration;
    } catch (error) {
      console.error(`Failed to load variant configuration for ${resolvedVariantId}:`, error);
      throw new Error(
        `Invalid variant configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  /**
   * Resolve variant ID from environment
   */
  private resolveVariantId(): VariantId {
    if (typeof process === 'undefined') {
      throw new Error('The variant configuration is only available in the backend environment');
    }
    console.log('Using variant: ', process.env.MEMORIAALI_VARIANT);

    // Backend environment variable takes precedence
    if (typeof process !== 'undefined' && process.env) {
      const variantId = process.env.MEMORIAALI_VARIANT;
      if (!variantId) {
        throw new Error('MEMORIAALI_VARIANT environment variable is not set');
      }
      return variantId as VariantId;
    }
    throw new Error('Please set MEMORIAALI_VARIANT environment variable');
  }

  /**
   * Load variant configuration in backend environment
   */
  private loadVariant = (variantId: VariantId): VariantConfiguration => {
    // Try to load from bundled variants first
    try {
      const variantConfig = getVariant(variantId);
      if (variantConfig) {
        return variantConfig as VariantConfiguration;
      }
    } catch (error) {
      console.warn(`Failed to load bundled variant:`, error);
    }

    throw new Error(`Could not load configuration for variant: ${variantId}`);
  };

  /**
   * Get the current configuration
   */
  getConfiguration = (): VariantConfiguration => {
    if (!this.configuration) {
      const config = this.loadConfiguration();
      if (!this.configuration) {
        throw new Error('Configuration not loaded. Call loadConfiguration() first.');
      }
    }
    return this.configuration;
  };

  /**
   * Get a frontend-safe configuration without security fields
   */
  getPublicConfiguration = (): PublicVariantConfiguration => {
    if (!this.publicConfiguration) {
      this.loadConfiguration();
      if (!this.publicConfiguration) {
        throw new Error('Public configuration not available.');
      }
    }
    return this.publicConfiguration;
  };

  /**
   * Get a specific feature configuration
   */
  getFeature = <T extends FeatureId>(featureId: T): ExtractFeatureConfig<T> | null => {
    const config = this.getConfiguration();
    const feature = config.features.find((f) => f.feature === featureId);
    return (feature as ExtractFeatureConfig<T>) ?? null;
  };

  /**
   * Check if a feature is enabled
   */
  hasFeature = (featureId: FeatureId): boolean => {
    return !!this.getFeature(featureId);
  };

  /**
   * Get localization value
   */
  getLocalizationValue = <K extends keyof VariantConfiguration['localization']>(
    key: K,
  ): VariantConfiguration['localization'][K] => {
    const config = this.getConfiguration();
    return config.localization[key];
  };

  /**
   * Get security value
   */
  getSecurityValue = <K extends keyof VariantConfiguration['security']>(
    key: K,
  ): VariantConfiguration['security'][K] => {
    const config = this.getConfiguration();
    return config.security[key];
  };

  /**
   * Get organization value
   */
  getOrganizationValue = <K extends keyof VariantConfiguration['organization']>(
    key: K,
  ): VariantConfiguration['organization'][K] => {
    const config = this.getConfiguration();
    return config.organization[key];
  };

  /**
   * Clear cached configuration
   */
  clearCache = (): void => {
    this.configuration = null;
    this.publicConfiguration = null;
    this.variantId = null;
  };
}

/**
 * Default export for convenience
 */
export const variantLoader = VariantConfigLoader.getInstance();
