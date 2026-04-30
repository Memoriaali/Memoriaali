/**
 * XAMK (South-Eastern Finland University of Applied Sciences) variant configuration
 */

import { createFeatureConfig } from '../src/definitions/features';
import type { VariantConfiguration } from '../src/schemas/variant-schema';

// Remember to rebuild (at root: pnpm build) the project after changing the config values

export const xamkVariant: VariantConfiguration = {
  id: 'xamk',
  name: 'XAMK Memoriaali',
  description: 'South-Eastern Finland University of Applied Sciences Digital Archive',
  version: '1.0.0',

  organization: {
    id: 'xamk',
    name: 'Kaakkois-Suomen ammattikorkeakoulu',
    shortName: 'XAMK',
    description: 'South-Eastern Finland University of Applied Sciences',
    type: 'university',
    country: 'FI',
    language: 'fi',
    contact: {
      email: 'memoriaali@xamk.fi',
      phone: '+358 44 702 8100',
      address: 'Patteristonkatu 3, 50100 Mikkeli, Finland',
      website: 'https://www.xamk.fi',
    },
    legal: {
      privacyPolicyUrl: 'https://memoriaali.memorylab.fi/tietosuoja',
      termsOfServiceUrl: 'https://memoriaali.memorylab.fi/kayttoehdot',
      dataProtectionOfficer: 'memoriaali@xamk.fi',
      gdprCompliant: true,
    },
  },

  features: [
    createFeatureConfig({
      feature: 'flawDetection',
      config: {
        api: 'http://192.168.10.164:4003',
        emptyPages: true,
        postIt: true,
        foldedCorner: true,
      },
    }),
    createFeatureConfig({
      feature: 'metadataDetection',
      config: {
        api: 'http://192.168.10.164:3001',
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
    createFeatureConfig({
      feature: 'oralHistory',
      config: {
        enabled: true,
      },
    }),
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
    dateFormat: 'dd.MM.yyyy',
    timeFormat: 'HH:mm',
    timeZone: 'Europe/Helsinki',
    firstDayOfWeek: 1,
    numberFormat: {
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      currency: 'EUR',
      currencyPosition: 'after',
    },
    customTranslations: {
      fi: {
        'app.title': 'XAMK Memoriaali',
      },
      en: {
        'app.title': 'XAMK Memoriaali',
      },
    },
  },

  security: {
    sessionTimeout: 120,
    refreshTokenEnabled: true,
    allowedOrigins: [
      'https://memoriaali.memorylab.fi',
      'https://www.xamk.fi',
      'http://192.168.10.134',
      'http://192.168.10.134:3000',
    ],
    allowedDomains: ['memorylab.fi'],
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    requireHttps: false,
    contentSecurityPolicy:
      "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'",
    rateLimiting: {
      enabled: true,
      windowMs: 60000,
      maxRequests: 100,
    },
  },

  metadata: {
    institutionCode: 'XAMK',
    isil: 'FI-XAM',
    organizationType: 'HigherEducation',
  },
};

export default xamkVariant;
