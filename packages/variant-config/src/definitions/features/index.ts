/**
 * Feature definitions with Zod schemas for variant configurations.
 * Each feature has its own strict schema and TypeScript type.
 */
import { z } from 'zod';
import { FlawDetectionConfigSchema } from './schemas/FlawDetectionSchema';
import { MetadataDetectionConfigSchema } from './schemas/MetadataDetectionSchema';
import { OralHistoryConfigSchema } from './schemas/OralHistoryConfigSchema';
import { SipConfigSchema } from './schemas/SipConfigSchema';

/**
 * Main FEATURES object containing all feature schemas.
 *
 * Add new features to this object with the feature name as the key and the
 * schema as the value.
 */
export const FEATURES = {
  flawDetection: FlawDetectionConfigSchema,
  metadataDetection: MetadataDetectionConfigSchema,
  oralHistory: OralHistoryConfigSchema,
  sip: SipConfigSchema,
} as const;

/**
 * Extract FeatureId type from FEATURES keys
 */
export type FeatureId = keyof typeof FEATURES;

/**
 * Array of feature keys for runtime operations
 */
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureId[];

/**
 * Type inference for individual feature configs.
 *
 * Add new feature types to this object with the feature name as the key and the
 * type as the value.
 */
export type FlawDetectionConfig = z.infer<typeof FlawDetectionConfigSchema>;
export type MetadataConfig = z.infer<typeof MetadataDetectionConfigSchema>;
export type OralHistoryConfig = z.infer<typeof OralHistoryConfigSchema>;
export type SipConfig = z.infer<typeof SipConfigSchema>;

/**
 * Discriminated union type for all feature configurations
 */
/**
 * Type map from feature id to its configuration type
 */
type FeatureConfigMap = { [K in FeatureId]: z.infer<(typeof FEATURES)[K]> };

/**
 * Discriminated union type for all feature configurations
 */
export type FeatureConfiguration = FeatureConfigMap[FeatureId];

/**
 * Helper type to extract configuration for a specific feature
 */
export type ExtractFeatureConfig<T extends FeatureId> = FeatureConfigMap[T];

/**
 * Union schema for any feature configuration (for runtime validation)
 */
export const FeatureConfigurationSchema = z.discriminatedUnion('feature', [
  FlawDetectionConfigSchema,
  MetadataDetectionConfigSchema,
  OralHistoryConfigSchema,
  SipConfigSchema,
]);

/**
 * Type guard to check if a value is a valid feature key
 */
export const isFeatureKey = (value: FeatureId): value is FeatureId => {
  return value in FEATURES;
};

/**
 * Type guard to check if a configuration is for a specific feature
 */
export const isFeatureConfig = <T extends FeatureId>(
  config: FeatureConfiguration,
  feature: T,
): config is ExtractFeatureConfig<T> => {
  return config.feature === feature;
};

/**
 * Helper to create a typed feature configuration with validation
 */
export const createFeatureConfig = <T extends FeatureConfiguration>(config: T): T => {
  // Validate against the appropriate schema
  const schema = FEATURES[config.feature as FeatureId];
  return schema.parse(config) as T;
};

/**
 * Validate a feature configuration
 */
export const validateFeatureConfig = (config: unknown): FeatureConfiguration => {
  return FeatureConfigurationSchema.parse(config);
};
