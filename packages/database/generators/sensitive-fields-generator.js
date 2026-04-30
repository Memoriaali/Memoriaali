#!/usr/bin/env node

/**
 * MEMORIAALI SENSITIVE FIELDS GENERATOR
 * ====================================
 *
 * Custom Prisma generator that processes @sensitive annotations and generates:
 * - TypeScript types for field-level security
 * - Utility functions for safe field picking
 * - Security metadata for runtime validation
 */

import generatorHelperPkg from '@prisma/generator-helper';
import prismaSdkPkg from '@prisma/sdk';
import fs from 'fs';
import { generateFieldPickingHelpers } from './utils/generate-field-picking-helpers.js';
import { generateSecurityUtilities } from './utils/generate-security-utilities.js';
import { generateSensitiveFieldsTypes } from './utils/generate-sensitive-fields-types.js';
import { processSensitiveFields } from './utils/process-sensitive-fields.js';

// Generator metadata
export const GENERATOR_NAME = 'memoriaali-sensitive-fields';

const { generatorHandler } = generatorHelperPkg;
const { logger } = prismaSdkPkg;

generatorHandler({
  onManifest() {
    logger.info(`${GENERATOR_NAME}:Registered`);
    return {
      version: '1.0.0',
      defaultOutput: './generated/sensitive-fields',
      prettyName: 'Memoriaali Sensitive Fields Generator',
    };
  },

  onGenerate: async (options) => {
    const outputDir = options.generator.output?.value || './generated/sensitive-fields';

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Process the schema and extract @sensitive annotations
    const sensitiveFieldsMap = processSensitiveFields(options.dmmf);

    // Generate TypeScript files
    await generateSensitiveFieldsTypes(outputDir, sensitiveFieldsMap);
    await generateSecurityUtilities(outputDir, sensitiveFieldsMap);
    await generateFieldPickingHelpers(outputDir, sensitiveFieldsMap);

    logger.info(`${GENERATOR_NAME}: Generated sensitive fields metadata`);
  },
});
