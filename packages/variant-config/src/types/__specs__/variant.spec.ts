/**
 * Comprehensive Test Suite for Variant Configuration Merging
 *
 * This test suite validates the mergeVariantConfigurations function with:
 * - Deep object merging behavior
 * - Array replacement strategy
 * - Special handling for features and permissions
 * - Edge cases and error scenarios
 * - Type safety validation
 */

import { describe, expect, it } from 'vitest';
import { createFeatureConfig } from '../../definitions/features';
import type { PartialVariantConfiguration, VariantConfiguration } from '../variant';
import { mergeVariantConfigurations } from '../variant';

// ============================================================================
// Test Fixtures and Helpers
// ============================================================================

/**
 * Creates a minimal valid variant configuration for testing
 */
const createBaseVariant = (): VariantConfiguration => ({
  id: 'test-base',
  name: 'Test Base Variant',
  version: '1.0.0',
  organization: {
    id: 'test-org',
    name: 'Test Organization',
    type: 'private',
    country: 'FI',
    language: 'fi',
    contact: {
      email: 'test@example.com',
    },
  },
  features: [
    createFeatureConfig({
      feature: 'comments',
      enabled: true,
      config: {
        allowAnonymous: false,
        requireModeration: true,
        maxLength: 1000,
        allowReplies: true,
        allowEditing: false,
        editTimeLimit: 15,
      },
    }),
  ],
  theme: {
    mode: 'light',
    colors: {
      primary: '#0066CC',
      'primary:hover': '#0080FF',
      'primary:active': '#004499',
      secondary: '#6B7280',
      'secondary:hover': '#7B8594',
      'secondary:active': '#525A66',
      accent: '#10B981',
      'accent:hover': '#34D399',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      'background:primary': '#FFFFFF',
      'background:secondary': '#F9FAFB',
      'background:tertiary': '#F3F4F6',
      'text:primary': '#111827',
      'text:secondary': '#374151',
      'text:muted': '#6B7280',
      'text:inverse': '#FFFFFF',
      'border:primary': '#E5E7EB',
      'border:secondary': '#D1D5DB',
      'border:focus': '#0066CC',
      'shadow:primary': 'rgba(0, 0, 0, 0.08)',
      'shadow:secondary': 'rgba(0, 0, 0, 0.16)',
    },
    layout: {
      mode: 'sidebar',
      containerMaxWidth: '1200px',
      sidebarWidth: '280px',
      headerHeight: '64px',
      footerHeight: '48px',
    },
    typography: {
      fonts: {
        base: 'Inter, sans-serif',
        heading: 'Inter, sans-serif',
        mono: 'Fira Code, monospace',
        display: 'Inter, sans-serif',
      },
      baseFontSize: '16px',
      lineHeight: '1.5',
      scale: 1.25,
    },
    spacing: {
      scale: 'comfortable',
      baseUnit: '8px',
      values: {
        none: '0',
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
        '5xl': '96px',
        '6xl': '128px',
        gutter: '16px',
        section: '48px',
        paragraph: '16px',
        'list-item': '8px',
        input: '12px 16px',
        button: '12px 24px',
        card: '24px',
        modal: '32px',
        header: '16px 24px',
        footer: '24px 24px',
      },
    },
    borders: {
      radius: 'md',
      width: '1px',
      style: 'solid',
    },
    shadows: {
      enabled: true,
      intensity: 'light',
    },
    animation: {
      preference: 'normal',
      duration: '200ms',
      easing: 'ease-in-out',
    },
    assets: {
      logo: {
        light: '/logo-light.svg',
        dark: '/logo-dark.svg',
        height: '40px',
      },
      favicon: '/favicon.ico',
    },
  },
  localization: {
    defaultLocale: 'fi',
    availableLocales: ['fi', 'en'],
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    timeZone: 'Europe/Helsinki',
    firstDayOfWeek: 1,
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      currency: 'EUR',
      currencyPosition: 'before',
    },
  },
  security: {
    sessionTimeout: 3600,
    refreshTokenEnabled: true,
    allowedOrigins: ['http://localhost:3000'],
    allowedDomains: ['localhost'],
    maxLoginAttempts: 5,
    lockoutDuration: 900,
    requireHttps: false,
    rateLimiting: {
      enabled: true,
      windowMs: 900000,
      maxRequests: 100,
    },
  },
  permissions: {
    defaultRole: 'USER',
    customRoles: [],
  },
});

// ============================================================================
// Test Suite
// ============================================================================

describe('mergeVariantConfigurations', () => {
  describe('Basic Merging', () => {
    it('should return base configuration when no overrides provided', () => {
      const base = createBaseVariant();
      const result = mergeVariantConfigurations(base);

      expect(result).toEqual(base);
      expect(result).not.toBe(base); // Should be a new object
    });

    it('should merge simple top-level properties', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        id: 'test-override',
        name: 'Override Name',
        version: '2.0.0',
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.id).toBe('test-override');
      expect(result.name).toBe('Override Name');
      expect(result.version).toBe('2.0.0');
      expect(result.organization).toEqual(base.organization); // Unchanged
    });

    it('should handle undefined overrides gracefully', () => {
      const base = createBaseVariant();
      const result = mergeVariantConfigurations(base, undefined as any, null as any);

      expect(result).toEqual(base);
    });
  });

  describe('Deep Object Merging', () => {
    it('should deep merge theme configuration', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        theme: {
          mode: 'dark',
          colors: {
            primary: '#FF0000',
            secondary: '#00FF00',
          },
        },
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.theme.mode).toBe('dark');
      expect(result.theme.colors.primary).toBe('#FF0000');
      expect(result.theme.colors.secondary).toBe('#00FF00');
      expect(result.theme.colors.accent).toBe('#10B981'); // Preserved from base
      expect(result.theme.layout).toEqual(base.theme.layout); // Unchanged
    });

    it('should deep merge organization configuration', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        organization: {
          name: 'Updated Organization',
          contact: {
            phone: '+358 123 456789',
          },
        },
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.organization.name).toBe('Updated Organization');
      expect(result.organization.contact.phone).toBe('+358 123 456789');
      expect(result.organization.contact.email).toBe('test@example.com'); // Preserved
      expect(result.organization.type).toBe('private'); // Preserved
    });

    it('should deep merge security configuration', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        security: {
          sessionTimeout: 7200,
          rateLimiting: {
            enabled: true,
            windowMs: 900000,
            maxRequests: 50,
          },
        },
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.security.sessionTimeout).toBe(7200);
      expect(result.security.rateLimiting.maxRequests).toBe(50);
      expect(result.security.rateLimiting.enabled).toBe(true); // Preserved
      expect(result.security.rateLimiting.windowMs).toBe(900000); // Preserved
    });
  });

  describe('Array Handling', () => {
    it('should replace arrays completely, not merge them', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        localization: {
          availableLocales: ['en', 'sv', 'ru'],
        },
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.localization.availableLocales).toEqual(['en', 'sv', 'ru']);
      expect(result.localization.availableLocales).not.toContain('fi');
    });

    it('should replace allowedOrigins array', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        security: {
          allowedOrigins: ['https://production.com', 'https://staging.com'],
        },
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.security.allowedOrigins).toEqual([
        'https://production.com',
        'https://staging.com',
      ]);
      expect(result.security.allowedOrigins).not.toContain('http://localhost:3000');
    });
  });

  describe('Features Handling', () => {
    it('should completely replace features array when provided', () => {
      const base = createBaseVariant();
      const newFeatures = [
        createFeatureConfig({
          feature: 'ocr',
          enabled: true,
          config: {
            maxFile: '50MB',
            allowedFormats: ['pdf', 'doc'],
          },
        }),
      ];

      const override: PartialVariantConfiguration = {
        features: newFeatures,
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.features).toEqual(newFeatures);
      expect(result.features).toHaveLength(1);
      expect(result.features[0].feature).toBe('ocr');
    });

    it('should not merge features arrays', () => {
      const base = createBaseVariant();
      const additionalFeature = createFeatureConfig({
        feature: 'admin',
        enabled: true,
        config: {
          enableSystemMonitoring: true,
          enableAuditLog: true,
          enableBackups: false,
          maintenanceMode: {
            enabled: false,
          },
        },
      });

      const override: PartialVariantConfiguration = {
        features: [additionalFeature],
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.features).toHaveLength(1);
      expect(result.features[0].feature).toBe('admin');
      // Comments feature from base should NOT be present
      expect(result.features.find((f) => f.feature === 'comments')).toBeUndefined();
    });
  });

  describe('Permissions Handling', () => {
    it('should replace permissions when provided', () => {
      const base = createBaseVariant();
      const newPermissions = {
        defaultRole: 'ADMIN',
        customRoles: [
          {
            id: 'moderator',
            name: { en: 'Moderator', fi: 'Moderoija' },
            permissions: ['comments:moderate', 'documents:read'],
            isDefault: false,
          },
        ],
      };

      const override: PartialVariantConfiguration = {
        permissions: newPermissions,
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.permissions).toEqual(newPermissions);
    });

    it('should not override permissions when set to undefined', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        permissions: undefined,
      };

      const result = mergeVariantConfigurations(base, override);

      // When permissions is undefined in override, it should keep the base permissions
      expect(result.permissions).toEqual(base.permissions);
    });

    it('should allow removing permissions by setting to null', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        permissions: null as any,
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.permissions).toBeUndefined();
    });
  });

  describe('Multiple Overrides', () => {
    it('should apply multiple overrides in order', () => {
      const base = createBaseVariant();
      const override1: PartialVariantConfiguration = {
        name: 'First Override',
        theme: {
          mode: 'dark',
        },
      };
      const override2: PartialVariantConfiguration = {
        name: 'Second Override',
        version: '3.0.0',
      };
      const override3: PartialVariantConfiguration = {
        theme: {
          mode: 'light',
          colors: {
            primary: '#123456',
          },
        },
      };

      const result = mergeVariantConfigurations(base, override1, override2, override3);

      expect(result.name).toBe('Second Override'); // From override2
      expect(result.version).toBe('3.0.0'); // From override2
      expect(result.theme.mode).toBe('light'); // From override3 (last one wins)
      expect(result.theme.colors.primary).toBe('#123456'); // From override3
    });

    it('should handle empty override arrays', () => {
      const base = createBaseVariant();
      const result = mergeVariantConfigurations(base, {}, {}, {});

      expect(result).toEqual(base);
    });
  });

  describe('Nested Object Merging', () => {
    it('should deep merge nested theme typography', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        theme: {
          typography: {
            fonts: {
              base: 'Roboto, sans-serif',
            },
            baseFontSize: '16px',
            lineHeight: '1.5',
            scale: 1.5,
          },
        },
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.theme.typography.fonts.base).toBe('Roboto, sans-serif');
      expect(result.theme.typography.fonts.heading).toBe('Inter, sans-serif'); // Preserved
      expect(result.theme.typography.scale).toBe(1.5);
      expect(result.theme.typography.baseFontSize).toBe('16px'); // Preserved
    });

    it('should deep merge theme spacing values', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        theme: {
          spacing: {
            scale: 'comfortable',
            baseUnit: '8px',
            values: {
              xs: '3px',
              sm: '6px',
              md: '9px', // Override existing value
            },
          },
        },
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.theme.spacing.values.xs).toBe('3px'); // Overridden
      expect(result.theme.spacing.values.sm).toBe('6px'); // Overridden
      expect(result.theme.spacing.values.md).toBe('9px'); // Overridden
      expect(result.theme.spacing.values.lg).toBe('16px'); // Preserved from base
    });
  });

  describe('Edge Cases', () => {
    it('should preserve original base object immutability', () => {
      const base = createBaseVariant();
      const originalThemeMode = base.theme.mode;
      const originalOrgName = base.organization.name;

      const override: PartialVariantConfiguration = {
        theme: { mode: 'dark' },
        organization: { name: 'Modified' },
      };

      mergeVariantConfigurations(base, override);

      expect(base.theme.mode).toBe(originalThemeMode);
      expect(base.organization.name).toBe(originalOrgName);
    });

    it('should handle deeply nested undefined values', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        theme: {
          assets: {
            logo: {
              light: '/logo-light.svg',
              dark: '/logo-dark.svg',
              height: '40px',
            },
            favicon: '/favicon.ico',
            ogImage: 'https://example.com/og.png',
          },
        },
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.theme.assets.ogImage).toBe('https://example.com/og.png');
      expect(result.theme.assets.logo).toEqual(base.theme.assets.logo);
    });

    it('should handle metadata object merging', () => {
      const base = createBaseVariant();
      base.metadata = { custom: 'value', nested: { data: 'test' } };

      const override: PartialVariantConfiguration = {
        metadata: {
          custom: 'overridden',
          additional: 'new',
          nested: { extra: 'field' },
        },
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.metadata).toEqual({
        custom: 'overridden',
        additional: 'new',
        nested: { data: 'test', extra: 'field' },
      });
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety with partial configurations', () => {
      const base = createBaseVariant();
      const override: PartialVariantConfiguration = {
        // Only partial theme config
        theme: {
          mode: 'dark',
        },
      };

      const result = mergeVariantConfigurations(base, override);

      // TypeScript should know these exist
      expect(result.theme.colors).toBeDefined();
      expect(result.theme.layout).toBeDefined();
      expect(result.theme.typography).toBeDefined();
    });

    it('should handle optional fields correctly', () => {
      const base = createBaseVariant();
      delete base.metadata;
      delete base.permissions;

      const override: PartialVariantConfiguration = {
        metadata: { test: 'data' },
        permissions: {
          defaultRole: 'VIEWER',
          customRoles: [],
        },
      };

      const result = mergeVariantConfigurations(base, override);

      expect(result.metadata).toEqual({ test: 'data' });
      expect(result.permissions).toEqual({
        defaultRole: 'VIEWER',
        customRoles: [],
      });
    });
  });
});
