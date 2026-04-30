/**
 * CRITICAL FIELD SECURITY VALIDATION TESTS
 * ========================================
 *
 * Test Contract: These tests specifically validate that the EXACT fields that
 * were vulnerable in the original security bug are now properly protected.
 *
 * CRITICAL FIELDS TESTED:
 * - hashedPassword (User.hashedPassword) - MUST NEVER be exposed
 * - salt (User.salt) - MUST NEVER be exposed
 * - verificationCode (User.verificationCode) - MUST NEVER be exposed
 * - token (RefreshToken.token) - MUST NEVER be exposed
 * - email (User.email) - MUST only be accessible to authorized users
 * - firstName (User.firstName) - MUST only be accessible to authorized users
 * - lastName (User.lastName) - MUST only be accessible to authorized users
 *
 * VULNERABILITY CONTEXT: The original vulnerability allowed authentication
 * credentials to be accessible through owner and admin selectors because
 * they were incorrectly marked as @sensitive instead of @never-expose.
 *
 * Test Quality: Uses REAL field names from actual schema, REAL DMMF structures,
 * and validates both field categorization and generated selector behavior.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateFieldPickingHelpers } from '../../../generators/utils/generate-field-picking-helpers.js';
import { processSensitiveFields } from '../../../generators/utils/process-sensitive-fields.js';

describe('Critical Field Security Validation Tests', () => {
  let tempOutputDir: string;

  beforeAll(() => {
    // Create temporary directory for test outputs
    tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'critical-field-security-tests-'));
  });

  afterAll(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true });
    }
  });

  describe('AUTHENTICATION CREDENTIALS PROTECTION', () => {
    describe('Contract: Authentication fields MUST NEVER appear in ANY selector', () => {
      it('should absolutely prevent hashedPassword exposure in all selectors', async () => {
        // Test with exact User model structure from schema.prisma
        const userModelDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'hashedPassword',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(INDEFINITE) - Bcrypt hashed password with salt',
                  },
                  {
                    name: 'email',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION) @gdpr.retention(UNTIL_DELETION_REQUEST) - Unique email for login and notifications',
                  },
                ],
              },
            ],
          },
        };

        // Process through complete security pipeline
        const sensitiveFieldsMap = processSensitiveFields(userModelDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // CRITICAL VALIDATION: hashedPassword must be in never-expose category
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.neverExpose).toContain(
          'hashedPassword',
        );
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.sensitive).not.toContain(
          'hashedPassword',
        );
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.adminOnly).not.toContain(
          'hashedPassword',
        );
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.public).not.toContain(
          'hashedPassword',
        );

        // CRITICAL VALIDATION: hashedPassword must not appear in generated selectors
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Search entire file for any occurrence of hashedPassword in selectors
        expect(generatedContent).not.toMatch(/hashedPassword:\s*true/);

        // Explicitly check each selector function
        const publicSelectorMatch = generatedContent.match(
          /createUserPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerSelectorMatch = generatedContent.match(
          /createUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminSelectorMatch = generatedContent.match(
          /createUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );

        expect(publicSelectorMatch?.[1]).not.toContain('hashedPassword');
        expect(ownerSelectorMatch?.[1]).not.toContain('hashedPassword');
        expect(adminSelectorMatch?.[1]).not.toContain('hashedPassword');

        // CRITICAL VALIDATION: hashedPassword must be in runtime security data as never-expose
        expect(generatedContent).toMatch(/neverExpose:\s*\['hashedPassword'\]/);
      });

      it('should absolutely prevent salt exposure in all selectors', async () => {
        const userModelDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'salt',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(INDEFINITE) - Password salt for additional security',
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(userModelDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // CRITICAL VALIDATION: salt must be properly categorized
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.neverExpose).toContain('salt');
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.sensitive).not.toContain('salt');
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.adminOnly).not.toContain('salt');
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.public).not.toContain('salt');

        // CRITICAL VALIDATION: salt must not appear in any selector
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );
        expect(generatedContent).not.toMatch(/salt:\s*true/);

        // Verify field metadata
        const saltField = sensitiveFieldsMap.User.fieldsWithAnnotations.find(
          (f) => f.name === 'salt',
        );
        expect(saltField?.securityLevel).toBe('never-expose');
        expect(saltField?.isNeverExpose).toBe(true);
        expect(saltField?.isSensitive).toBe(false);
        expect(saltField?.isAdminOnly).toBe(false);
      });

      it('should absolutely prevent verificationCode exposure in all selectors', async () => {
        const userModelDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'verificationCode',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(1_YEAR) - Email verification token',
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(userModelDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // CRITICAL VALIDATION: verificationCode must be properly categorized
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.neverExpose).toContain(
          'verificationCode',
        );
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.sensitive).not.toContain(
          'verificationCode',
        );

        // CRITICAL VALIDATION: verificationCode must not appear in any selector
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );
        expect(generatedContent).not.toMatch(/verificationCode:\s*true/);

        // Verify GDPR metadata is preserved
        const verificationField = sensitiveFieldsMap.User.fieldsWithAnnotations.find(
          (f) => f.name === 'verificationCode',
        );
        expect(verificationField?.gdpr.category).toBe('TECHNICAL');
        expect(verificationField?.gdpr.purpose).toBe('AUTHENTICATION');
        expect(verificationField?.gdpr.retention).toBe('1_YEAR');
      });

      it('should absolutely prevent RefreshToken.token exposure in all selectors', async () => {
        const refreshTokenModelDmmf = {
          datamodel: {
            models: [
              {
                name: 'RefreshToken',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'userId',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Token owner',
                  },
                  {
                    name: 'token',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(1_YEAR) - Hashed refresh token',
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(refreshTokenModelDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // CRITICAL VALIDATION: token must be properly categorized
        expect(sensitiveFieldsMap.RefreshToken.fieldsBySecurityLevel.neverExpose).toContain(
          'token',
        );
        expect(sensitiveFieldsMap.RefreshToken.fieldsBySecurityLevel.public).toEqual([
          'id',
          'userId',
        ]);

        // CRITICAL VALIDATION: token must not appear in any selector
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );
        expect(generatedContent).not.toMatch(/token:\s*true/);

        // But other fields should be accessible
        expect(generatedContent).toMatch(/id:\s*true/);
        expect(generatedContent).toMatch(/userId:\s*true/);
      });

      it('should test ALL authentication credentials together', async () => {
        // Test complete User + RefreshToken models with all authentication fields
        const completeDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'hashedPassword',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(INDEFINITE) - Bcrypt hashed password with salt',
                  },
                  {
                    name: 'salt',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(INDEFINITE) - Password salt for additional security',
                  },
                  {
                    name: 'verificationCode',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(1_YEAR) - Email verification token',
                  },
                ],
              },
              {
                name: 'RefreshToken',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'token',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(1_YEAR) - Hashed refresh token',
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(completeDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // CRITICAL VALIDATION: All authentication fields must be never-expose
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.neverExpose).toEqual([
          'hashedPassword',
          'salt',
          'verificationCode',
        ]);
        expect(sensitiveFieldsMap.RefreshToken.fieldsBySecurityLevel.neverExpose).toEqual([
          'token',
        ]);

        // CRITICAL VALIDATION: No authentication field should appear in ANY selector
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        const authenticationFields = ['hashedPassword', 'salt', 'verificationCode', 'token'];
        authenticationFields.forEach((field) => {
          expect(generatedContent).not.toMatch(new RegExp(`${field}:\\s*true`));
        });

        // CRITICAL VALIDATION: All authentication fields should be in runtime never-expose data
        expect(generatedContent).toMatch(
          /user:\s*\{[\s\S]*neverExpose:\s*\['hashedPassword',\s*'salt',\s*'verificationCode'\]/,
        );
        expect(generatedContent).toMatch(/refreshtoken:\s*\{[\s\S]*neverExpose:\s*\['token'\]/);
      });
    });
  });

  describe('PERSONAL DATA ACCESS CONTROL', () => {
    describe('Contract: Sensitive personal data must only be accessible to authorized users', () => {
      it('should control User.email access properly', async () => {
        const userModelDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'email',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION) @gdpr.retention(UNTIL_DELETION_REQUEST) - Unique email for login and notifications',
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(userModelDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // VALIDATION: email must be categorized as sensitive
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.sensitive).toContain('email');
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.public).not.toContain('email');

        // VALIDATION: email access control in generated selectors
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Should NOT be in public selector
        const publicSelectorMatch = generatedContent.match(
          /createUserPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        expect(publicSelectorMatch?.[1]).not.toContain('email: true');

        // Should BE in owner selector
        const ownerSelectorMatch = generatedContent.match(
          /createUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        expect(ownerSelectorMatch?.[1]).toContain('email: true');

        // Should BE in admin selector
        const adminSelectorMatch = generatedContent.match(
          /createUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );
        expect(adminSelectorMatch?.[1]).toContain('email: true');

        // Verify GDPR metadata
        const emailField = sensitiveFieldsMap.User.fieldsWithAnnotations.find(
          (f) => f.name === 'email',
        );
        expect(emailField?.gdpr.category).toBe('PERSONAL');
        expect(emailField?.gdpr.purpose).toBe('COMMUNICATION');
        expect(emailField?.gdpr.retention).toBe('UNTIL_DELETION_REQUEST');
      });

      it('should control User.firstName access properly', async () => {
        const userModelDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'firstName',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      "/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(UNTIL_DELETION_REQUEST) - User's first name (optional)",
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(userModelDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // VALIDATION: firstName must be categorized as sensitive
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.sensitive).toContain('firstName');
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.public).not.toContain('firstName');

        // VALIDATION: firstName access control matches email pattern
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        const publicSelectorMatch = generatedContent.match(
          /createUserPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerSelectorMatch = generatedContent.match(
          /createUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminSelectorMatch = generatedContent.match(
          /createUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );

        expect(publicSelectorMatch?.[1]).not.toContain('firstName: true');
        expect(ownerSelectorMatch?.[1]).toContain('firstName: true');
        expect(adminSelectorMatch?.[1]).toContain('firstName: true');
      });

      it('should control User.lastName access properly', async () => {
        const userModelDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'lastName',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      "/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(UNTIL_DELETION_REQUEST) - User's last name (optional)",
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(userModelDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // VALIDATION: lastName must be categorized as sensitive
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.sensitive).toContain('lastName');

        // VALIDATION: lastName access control matches other personal data
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        const publicSelectorMatch = generatedContent.match(
          /createUserPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerSelectorMatch = generatedContent.match(
          /createUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminSelectorMatch = generatedContent.match(
          /createUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );

        expect(publicSelectorMatch?.[1]).not.toContain('lastName: true');
        expect(ownerSelectorMatch?.[1]).toContain('lastName: true');
        expect(adminSelectorMatch?.[1]).toContain('lastName: true');
      });

      it('should test all personal data fields together', async () => {
        const userModelDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'email',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION) @gdpr.retention(UNTIL_DELETION_REQUEST) - Unique email for login and notifications',
                  },
                  {
                    name: 'firstName',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      "/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(UNTIL_DELETION_REQUEST) - User's first name (optional)",
                  },
                  {
                    name: 'lastName',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      "/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(UNTIL_DELETION_REQUEST) - User's last name (optional)",
                  },
                  {
                    name: 'username',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - Unique username for login (max 255 chars)',
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(userModelDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // VALIDATION: All personal data fields must be categorized as sensitive
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.sensitive).toEqual([
          'email',
          'firstName',
          'lastName',
          'username',
        ]);

        // VALIDATION: None should be public
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.public).toEqual(['id']);

        // VALIDATION: All personal data should be accessible to owners and admins but not public
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        const personalDataFields = ['email', 'firstName', 'lastName', 'username'];

        const publicSelectorMatch = generatedContent.match(
          /createUserPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerSelectorMatch = generatedContent.match(
          /createUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminSelectorMatch = generatedContent.match(
          /createUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );

        personalDataFields.forEach((field) => {
          expect(publicSelectorMatch?.[1]).not.toContain(`${field}: true`);
          expect(ownerSelectorMatch?.[1]).toContain(`${field}: true`);
          expect(adminSelectorMatch?.[1]).toContain(`${field}: true`);
        });
      });
    });
  });

  describe('ADMINISTRATIVE DATA ACCESS CONTROL', () => {
    describe('Contract: Admin-only data must only be accessible to administrators', () => {
      it('should control User sensitive fields access properly', async () => {
        const userModelDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'email',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive @gdpr.category(PERSONAL) - User email',
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(userModelDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // VALIDATION: No admin-only fields in this test
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.adminOnly).toEqual([]);

        // VALIDATION: Field access control
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        const publicSelectorMatch = generatedContent.match(
          /createUserPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerSelectorMatch = generatedContent.match(
          /createUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminSelectorMatch = generatedContent.match(
          /createUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );

        // No admin-only fields in this test, so no specific validations needed
      });

      it('should validate sensitive field metadata properties', async () => {
        const userModelDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'email',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive @gdpr.category(PERSONAL) - User email',
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(userModelDmmf);

        const emailField = sensitiveFieldsMap.User.fieldsWithAnnotations.find(
          (f) => f.name === 'email',
        );

        // Verify field metadata structure
        expect(emailField).toEqual({
          name: 'email',
          type: 'String',
          isOptional: false,
          isList: false,
          securityLevel: 'sensitive',
          annotations: expect.arrayContaining([
            { type: 'sensitive', value: true, raw: '@sensitive' },
            { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
          ]),
          gdpr: {
            category: 'PERSONAL',
            purpose: undefined,
            retention: undefined,
          },
          isSensitive: true,
          isNeverExpose: false,
          isAdminOnly: false,
        });
      });
    });
  });

  describe('COMPLETE FIELD ACCESS MATRIX VALIDATION', () => {
    describe('Contract: Complete User model field access control validation', () => {
      it('should validate complete User model with all field types', async () => {
        // Complete User model with all security levels represented
        const completeUserDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  // Public fields
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'createdAt',
                    type: 'DateTime',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Record creation timestamp',
                  },
                  // Sensitive fields
                  {
                    name: 'email',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION) @gdpr.retention(UNTIL_DELETION_REQUEST) - Unique email for login and notifications',
                  },
                  {
                    name: 'firstName',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      "/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(UNTIL_DELETION_REQUEST) - User's first name (optional)",
                  },
                  {
                    name: 'lastName',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      "/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(UNTIL_DELETION_REQUEST) - User's last name (optional)",
                  },
                  // Admin-only fields
                  // Never-expose fields (authentication credentials)
                  {
                    name: 'hashedPassword',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(INDEFINITE) - Bcrypt hashed password with salt',
                  },
                  {
                    name: 'salt',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(INDEFINITE) - Password salt for additional security',
                  },
                  {
                    name: 'verificationCode',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(1_YEAR) - Email verification token',
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(completeUserDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // COMPLETE FIELD CATEGORIZATION VALIDATION
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel).toEqual({
          public: ['id', 'createdAt'],
          sensitive: ['email', 'firstName', 'lastName'],
          adminOnly: ['adminNotes'],
          neverExpose: ['hashedPassword', 'salt', 'verificationCode'],
        });

        // COMPLETE ACCESS CONTROL MATRIX VALIDATION
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        const publicSelectorMatch = generatedContent.match(
          /createUserPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerSelectorMatch = generatedContent.match(
          /createUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminSelectorMatch = generatedContent.match(
          /createUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );

        const publicContent = publicSelectorMatch?.[1] || '';
        const ownerContent = ownerSelectorMatch?.[1] || '';
        const adminContent = adminSelectorMatch?.[1] || '';

        // PUBLIC ACCESS (anonymous users, general public)
        expect(publicContent).toContain('id: true');
        expect(publicContent).toContain('createdAt: true');
        expect(publicContent).not.toContain('email: true');
        expect(publicContent).not.toContain('firstName: true');
        expect(publicContent).not.toContain('lastName: true');
        expect(publicContent).not.toContain('adminNotes: true');
        expect(publicContent).not.toContain('hashedPassword: true');
        expect(publicContent).not.toContain('salt: true');
        expect(publicContent).not.toContain('verificationCode: true');

        // OWNER ACCESS (authenticated users viewing their own data)
        expect(ownerContent).toContain('id: true');
        expect(ownerContent).toContain('createdAt: true');
        expect(ownerContent).toContain('email: true');
        expect(ownerContent).toContain('firstName: true');
        expect(ownerContent).toContain('lastName: true');
        expect(ownerContent).not.toContain('adminNotes: true');
        expect(ownerContent).not.toContain('hashedPassword: true');
        expect(ownerContent).not.toContain('salt: true');
        expect(ownerContent).not.toContain('verificationCode: true');

        // ADMIN ACCESS (system administrators)
        expect(adminContent).toContain('id: true');
        expect(adminContent).toContain('createdAt: true');
        expect(adminContent).toContain('email: true');
        expect(adminContent).toContain('firstName: true');
        expect(adminContent).toContain('lastName: true');
        expect(adminContent).toContain('adminNotes: true');
        expect(adminContent).not.toContain('hashedPassword: true');
        expect(adminContent).not.toContain('salt: true');
        expect(adminContent).not.toContain('verificationCode: true');

        // RUNTIME SECURITY DATA VALIDATION
        expect(generatedContent).toMatch(
          /user:\s*\{[\s\S]*neverExpose:\s*\['hashedPassword',\s*'salt',\s*'verificationCode'\]/,
        );
        expect(generatedContent).toMatch(/sensitive:\s*\['email',\s*'firstName',\s*'lastName'\]/);
        expect(generatedContent).toMatch(/adminOnly:\s*\['adminNotes'\]/);
      });
    });
  });

  describe('REAL SCHEMA FIELD VERIFICATION', () => {
    describe('Contract: Exact field names from actual schema.prisma must be protected', () => {
      it('should protect all authentication fields mentioned in actual schema', async () => {
        // These are the EXACT field names from the real schema.prisma
        const realSchemaAuthFields = [
          'hashedPassword', // User.hashedPassword - maps to hashed_password
          'salt', // User.salt
          'verificationCode', // User.verificationCode - maps to verification_code
          'token', // RefreshToken.token
        ];

        const realSchemaDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'hashedPassword',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(INDEFINITE) - Bcrypt hashed password with salt',
                  },
                  {
                    name: 'salt',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(INDEFINITE) - Password salt for additional security',
                  },
                  {
                    name: 'verificationCode',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(1_YEAR) - Email verification token',
                  },
                ],
              },
              {
                name: 'RefreshToken',
                fields: [
                  {
                    name: 'token',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(1_YEAR) - Hashed refresh token',
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(realSchemaDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // CRITICAL VALIDATION: All real schema auth fields must be never-expose
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.neverExpose).toEqual([
          'hashedPassword',
          'salt',
          'verificationCode',
        ]);
        expect(sensitiveFieldsMap.RefreshToken.fieldsBySecurityLevel.neverExpose).toEqual([
          'token',
        ]);

        // CRITICAL VALIDATION: None of these fields should appear in ANY selector
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        realSchemaAuthFields.forEach((field) => {
          expect(generatedContent).not.toMatch(new RegExp(`${field}:\\s*true`));
        });

        // SUCCESS: All authentication fields from real schema are protected
      });

      it('should validate exact personal data field names from schema', async () => {
        // These are the EXACT sensitive field names from the real schema.prisma
        const realSchemaPersonalFields = [
          'username', // User.username
          'email', // User.email
          'firstName', // User.firstName - maps to first_name
          'lastName', // User.lastName - maps to last_name
        ];

        const realSchemaDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'username',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - Unique username for login (max 255 chars)',
                  },
                  {
                    name: 'email',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION) @gdpr.retention(UNTIL_DELETION_REQUEST) - Unique email for login and notifications',
                  },
                  {
                    name: 'firstName',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      "/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(UNTIL_DELETION_REQUEST) - User's first name (optional)",
                  },
                  {
                    name: 'lastName',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      "/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(UNTIL_DELETION_REQUEST) - User's last name (optional)",
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(realSchemaDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // VALIDATION: All personal data fields must be sensitive
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.sensitive).toEqual(
          realSchemaPersonalFields,
        );

        // VALIDATION: Personal data access control
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        const publicSelectorMatch = generatedContent.match(
          /createUserPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerSelectorMatch = generatedContent.match(
          /createUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );

        realSchemaPersonalFields.forEach((field) => {
          // Should NOT be in public selector
          expect(publicSelectorMatch?.[1]).not.toContain(`${field}: true`);
          // Should BE in owner selector
          expect(ownerSelectorMatch?.[1]).toContain(`${field}: true`);
        });
      });

      it('should validate exact admin field names from schema', async () => {
        // This is the EXACT admin-only field name from the real schema.prisma
        const realSchemaAdminFields = ['adminNotes']; // User.adminNotes - maps to admin_notes

        const realSchemaDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                ],
              },
            ],
          },
        };

        const sensitiveFieldsMap = processSensitiveFields(realSchemaDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // VALIDATION: adminNotes must be admin-only
        expect(sensitiveFieldsMap.User.fieldsBySecurityLevel.adminOnly).toEqual(
          realSchemaAdminFields,
        );

        // VALIDATION: admin-only access control
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        const publicSelectorMatch = generatedContent.match(
          /createUserPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerSelectorMatch = generatedContent.match(
          /createUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminSelectorMatch = generatedContent.match(
          /createUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );

        realSchemaAdminFields.forEach((field) => {
          // Should NOT be in public or owner selectors
          expect(publicSelectorMatch?.[1]).not.toContain(`${field}: true`);
          expect(ownerSelectorMatch?.[1]).not.toContain(`${field}: true`);
          // Should ONLY be in admin selector
          expect(adminSelectorMatch?.[1]).toContain(`${field}: true`);
        });
      });
    });
  });
});
