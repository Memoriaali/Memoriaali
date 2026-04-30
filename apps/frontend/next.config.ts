import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Remove server information from response headers, for the security
  // of the server.
  poweredByHeader: false,
  experimental: {
    reactCompiler: true,
  },
  typedRoutes: true,
  transpilePackages: [
    // Add any monorepo packages that need transpilation
    '@memoriaali/shared',
    '@memoriaali/api-types',
  ],
  eslint: {
    // ESLint will be handled by our monorepo setup
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Type checking will be handled by our monorepo setup
    ignoreBuildErrors: false,
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
