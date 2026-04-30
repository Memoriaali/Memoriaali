import { type Permission } from '@memoriaali/access-control';
import { type VariantConfiguration } from '@memoriaali/variant-config';
import { describe, expect, it } from 'vitest';
import { hasAccess, type WithAccessProps } from '../hasAccess';

const makeUser = (roles: Array<'ADMIN' | 'MODERATOR' | 'USER' | 'EXPERT'>) => ({
  id: 'u1',
  email: 'u@example.com',
  firstName: 'U',
  lastName: 'S',
  roles,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const makeVariant = (
  features: Array<{
    feature: 'comments' | 'ocr' | 'research' | 'admin';
    config?: unknown;
  }>,
): VariantConfiguration => ({
  id: 'v1',
  name: 'v',
  version: '1',
  organization: {
    id: 'org',
    name: 'Org',
    country: 'FI',
    language: 'fi',
    type: 'university',
    contact: {},
  },
  description: 'desc',
  features: features.map((f) => ({
    feature: f.feature,
    config: (f as { config?: unknown }).config ?? {},
  })) as unknown as VariantConfiguration['features'],
  theme: {
    mode: 'light',
    colors: {},
    layout: {
      mode: 'sidebar',
      containerMaxWidth: '1200px',
      sidebarWidth: '300px',
      headerHeight: '64px',
      footerHeight: '64px',
    },
    typography: {
      fonts: {},
      baseFontSize: '16px',
      lineHeight: '1.5',
      scale: 1.2,
    },
    spacing: { scale: 'comfortable', baseUnit: '8px', values: {} },
    borders: { radius: 'md', width: '1px', style: 'solid' },
    shadows: { enabled: false, intensity: 'light' },
    animation: {
      preference: 'reduced',
      duration: '150ms',
      easing: 'ease-in-out',
    },
    assets: { logo: { light: '', dark: '', height: '24px' }, favicon: '' },
  },
  localization: {
    defaultLocale: 'fi',
    availableLocales: ['fi'],
    dateFormat: 'yyyy-MM-dd',
    timeFormat: 'HH:mm',
    timeZone: 'UTC',
    firstDayOfWeek: 1,
    numberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ' ',
      currency: 'EUR',
      currencyPosition: 'after',
    },
  },
  security: {
    sessionTimeout: 3600,
    refreshTokenEnabled: true,
    allowedOrigins: [],
    allowedDomains: [],
    maxLoginAttempts: 5,
    lockoutDuration: 300,
    requireHttps: false,
    rateLimiting: { enabled: false, windowMs: 60000, maxRequests: 500 },
  },
});

describe('hasAccess', () => {
  it('returns true when no constraints provided', () => {
    const props: WithAccessProps = { logic: 'and' };
    expect(hasAccess(props, undefined, undefined)).toBe(true);
  });

  it('checks authentication true', () => {
    const user = makeUser(['USER']);
    expect(hasAccess({ logic: 'and', whenAuthenticated: true }, user, undefined)).toBe(true);
    expect(hasAccess({ logic: 'and', whenAuthenticated: true }, undefined, undefined)).toBe(false);
  });

  it('checks authentication false (requires unauthenticated)', () => {
    const user = makeUser(['USER']);
    expect(hasAccess({ logic: 'and', whenAuthenticated: false }, undefined, undefined)).toBe(true);
    expect(hasAccess({ logic: 'and', whenAuthenticated: false }, user, undefined)).toBe(false);
  });

  it('checks a single role', () => {
    const user = makeUser(['USER']);
    expect(hasAccess({ logic: 'and', withRole: 'USER' }, user, undefined)).toBe(true);
    expect(hasAccess({ logic: 'and', withRole: 'ADMIN' }, user, undefined)).toBe(false);
  });

  it('checks multiple roles (any)', () => {
    const user = makeUser(['USER']);
    expect(hasAccess({ logic: 'and', withRoles: ['ADMIN', 'USER'] }, user, undefined)).toBe(true);
    expect(hasAccess({ logic: 'and', withRoles: ['ADMIN', 'MODERATOR'] }, user, undefined)).toBe(
      false,
    );
  });

  it('checks a single permission mapped from role', () => {
    const user = makeUser(['ADMIN']);
    // ADMIN has 'admin:all' in ROLE_PERMISSIONS
    expect(
      hasAccess({ logic: 'and', withPermission: 'admin:all' as Permission }, user, undefined),
    ).toBe(true);
    expect(
      hasAccess(
        { logic: 'and', withPermission: 'comments:delete' as Permission },
        makeUser(['USER']),
        undefined,
      ),
    ).toBe(false);
  });

  it('checks multiple permissions (any)', () => {
    const user = makeUser(['MODERATOR']);
    // MODERATOR has research:approve but not admin:all
    expect(
      hasAccess(
        {
          logic: 'and',
          withPermissions: ['admin:all', 'research:approve'] as Permission[],
        },
        user,
        undefined,
      ),
    ).toBe(true);
    expect(
      hasAccess({ logic: 'and', withPermissions: ['admin:all'] as Permission[] }, user, undefined),
    ).toBe(false);
  });

  it('checks a single feature from variant config', () => {
    const variant = makeVariant([{ feature: 'comments' }]);
    expect(hasAccess({ logic: 'and', withFeature: 'comments' }, undefined, variant)).toBe(true);
    expect(hasAccess({ logic: 'and', withFeature: 'research' }, undefined, variant)).toBe(false);
  });

  it('checks multiple features (any)', () => {
    const variant = makeVariant([{ feature: 'ocr' }]);
    expect(hasAccess({ logic: 'and', withFeatures: ['comments', 'ocr'] }, undefined, variant)).toBe(
      true,
    );
    expect(
      hasAccess({ logic: 'and', withFeatures: ['comments', 'research'] }, undefined, variant),
    ).toBe(false);
  });

  it('combines checks with AND logic (default)', () => {
    const user = makeUser(['USER']);
    const variant = makeVariant([{ feature: 'comments' }]);
    const props: WithAccessProps = {
      logic: 'and',
      whenAuthenticated: true,
      withRole: 'USER',
      withFeature: 'comments',
    };
    expect(hasAccess(props, user, variant)).toBe(true);

    const failingProps: WithAccessProps = { ...props, withRole: 'ADMIN' };
    expect(hasAccess(failingProps, user, variant)).toBe(false);
  });

  it('combines checks with OR logic', () => {
    const user = makeUser(['USER']);
    const variant = makeVariant([]);
    const props: WithAccessProps = {
      logic: 'or',
      withRole: 'ADMIN',
      withFeature: 'comments',
    };
    // Neither ADMIN role nor feature present
    expect(hasAccess(props, user, variant)).toBe(false);

    // Add a feature to satisfy OR
    const variant2 = makeVariant([{ feature: 'comments' }]);
    expect(hasAccess(props, user, variant2)).toBe(true);
  });
});
