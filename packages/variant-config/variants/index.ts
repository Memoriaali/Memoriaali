/**
 * Export all variant configurations
 */

import { defaultVariant } from './default';

const variants = {
  default: defaultVariant,
};

export type VariantId = keyof typeof variants;

export const getVariant = (variant: VariantId) => variants[variant];

export default variants;
