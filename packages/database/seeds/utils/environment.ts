/**
 * Environment detection utility for seeding
 */

/// <reference types="node" />

export type Environment = 'development' | 'staging' | 'production' | 'e2e';

export const getEnvironment = (): Environment => {
  const env = process.env.NODE_ENV?.toLowerCase();

  if (env === 'production') {
    return 'production';
  }

  if (env === 'staging') {
    return 'staging';
  }

  if (env === 'e2e') {
    return 'e2e';
  }

  // Default to development for safety
  return 'development';
};

export const isDevelopment = (): boolean => {
  return getEnvironment() === 'development';
};

export const isStaging = (): boolean => {
  return getEnvironment() === 'staging';
};

export const isProduction = (): boolean => {
  return getEnvironment() === 'production';
};

export const isE2E = (): boolean => {
  return getEnvironment() === 'e2e';
};

export const requireEnvironment = (required: Environment | Environment[]): void => {
  const current = getEnvironment();
  const allowedEnvs = Array.isArray(required) ? required : [required];

  if (!allowedEnvs.includes(current)) {
    throw new Error(
      `This operation is only allowed in ${allowedEnvs.join(' or ')} environment. ` +
        `Current environment: ${current}`,
    );
  }
};
