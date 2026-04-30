/**
 * Vitest setup file for frontend specs
 */

import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { vi } from 'vitest';

// Make React globally available
global.React = React;

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({ locale: 'fi' }),
}));

// Mock Next.js internationalization
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) => {
    // Return a simple translation mock
    return namespace ? `${namespace}.${key}` : key;
  },
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Auth provider and hook used by pages/components
vi.mock('@/hooks/useAuth', () => {
  const noopAsync = vi.fn().mockResolvedValue(undefined);
  return {
    // Generic mock provider that simply renders children without side effects
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    // Generic mock auth state for unit tests
    useAuth: () => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: noopAsync,
      logout: noopAsync,
      refreshUser: noopAsync,
    }),
  };
});
