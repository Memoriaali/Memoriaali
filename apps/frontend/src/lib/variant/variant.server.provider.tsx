/**
 * Server Component Variant Provider
 *
 * This server component fetches the variant configuration
 * and passes it to the client-side provider.
 */
import { VariantConfigLoader } from '@memoriaali/variant-config';
import { PropsWithChildren } from 'react';
import { VariantProvider } from './variant.provider';

/**
 * Server-side variant provider that fetches configuration
 * and passes it to the client provider
 */

export const ServerVariantProvider = ({ children }: PropsWithChildren) => {
  // Fetch configuration on the server
  const configuration = VariantConfigLoader.getInstance().getPublicConfiguration();

  // Log which config we're using
  if (!configuration) {
    throw new Error('Failed to fetch variant configuration');
  }

  return <VariantProvider configuration={configuration}>{children}</VariantProvider>;
};
