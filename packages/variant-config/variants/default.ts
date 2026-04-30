/**
 * Default variant configuration for development
 */

import { createFeatureConfig } from '../src/definitions/features';
import type { VariantConfiguration } from '../src/schemas/variant-schema';

export const defaultVariant: VariantConfiguration = {
  id: 'default',
  name: 'Default Development',
  description: 'Default configuration for development environment',
  version: '1.0.0',

  organization: {
    id: 'dev',
    name: 'Development Organization',
    shortName: 'DEV',
    description: 'Development and testing organization',
    type: 'private',
    country: 'FI',
    language: 'fi',
    contact: {
      email: 'dev@example.com',
      phone: '+358 00 000 0000',
      address: 'Development Street 1, 00100 Helsinki, Finland',
      website: 'https://localhost:3000',
    },
    legal: {
      privacyPolicyUrl: 'https://localhost:3000/privacy',
      termsOfServiceUrl: 'https://localhost:3000/terms',
      dataProtectionOfficer: 'dpo@example.com',
      gdprCompliant: true,
    },
  },

  features: [
    // Flaw detection feature
    createFeatureConfig({
      feature: 'flawDetection',
      enabled: true,
      config: {
        api: 'yourapiaddress',
        emptyPages: true,
        postIt: true,
        foldedCorner: true,
      },
    }),

    // Metadata detection feature
    createFeatureConfig({
      feature: 'metadataDetection',
      config: {
        api: 'yourapiaddress',
        annif: true,
        gpe: true,
        date: true,
        name: true,
        act: true,
        y_field: true,
        diar: true,
        product: true,
        event: true,
        norp: true,
      },
    }),

    // Oral History feature
    createFeatureConfig({
      feature: 'oralHistory',
      config: {
        enabled: true,
      },
    }),

    // SIP features
    createFeatureConfig({
      feature: 'sip',
      config: {
        enabled: true,
      },
    }),
  ],

  localization: {
    defaultLocale: 'fi',
    availableLocales: ['fi', 'en', 'sv'],
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
    allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
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
};

export default defaultVariant;
