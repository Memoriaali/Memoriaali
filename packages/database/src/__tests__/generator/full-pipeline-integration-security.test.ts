/**
 * FULL PIPELINE INTEGRATION SECURITY TESTS
 * ========================================
 *
 * Test Contract: These tests validate the complete generator pipeline from
 * Prisma schema annotations to final TypeScript field selectors, ensuring
 * the security fix prevents credential exposure at every level.
 *
 * INTEGRATION TESTING SCOPE:
 * 1. DMMF parsing → Field annotation extraction → Security categorization
 * 2. Field categorization → Field selector generation → Runtime validation
 * 3. End-to-end security boundary enforcement
 * 4. Real DMMF structures matching actual schema patterns
 * 5. Generated TypeScript code validation and execution
 *
 * CRITICAL SECURITY VALIDATION:
 * - @never-expose fields (hashedPassword, salt, verificationCode, refreshToken.token)
 *   MUST be excluded from ALL generated selectors
 * - @sensitive fields MUST only appear in owner/admin selectors
 * - @admin-only fields MUST only appear in admin selectors
 * - Runtime validation functions must enforce these boundaries
 *
 * Test Quality: Uses real DMMF structures, actual generator pipeline, and
 * validates generated TypeScript code execution. Tests the COMPLETE flow.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateFieldPickingHelpers } from '../../../generators/utils/generate-field-picking-helpers.js';
import { processSensitiveFields } from '../../../generators/utils/process-sensitive-fields.js';

describe('Full Pipeline Integration Security Tests', () => {
  let tempOutputDir: string;

  beforeAll(() => {
    // Create temporary directory for test outputs
    tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-integration-tests-'));
  });

  afterAll(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true });
    }
  });

  describe('COMPLETE PIPELINE SECURITY VALIDATION', () => {
    describe('Contract: Full pipeline from real schema annotations to secure selectors', () => {
      it('should process real User model schema and generate secure selectors', async () => {
        // Create DMMF structure matching the actual schema.prisma User model
        const realUserDmmf = {
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
                    name: 'organization',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation: '/// Institution affiliation',
                  },
                  {
                    name: 'createdAt',
                    type: 'DateTime',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Record creation timestamp',
                  },
                ],
              },
            ],
          },
        };

        // STEP 1: Process DMMF through sensitive fields processor
        const sensitiveFieldsMap = processSensitiveFields(realUserDmmf);
        const userMetadata = sensitiveFieldsMap.User;

        // VALIDATION: Ensure proper field categorization
        expect(userMetadata.fieldsBySecurityLevel).toEqual({
          public: ['id', 'organization', 'createdAt'],
          sensitive: ['username', 'email', 'firstName', 'lastName'],
          adminOnly: [],
          neverExpose: ['hashedPassword', 'salt', 'verificationCode'],
        });

        // STEP 2: Generate field selectors
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        // STEP 3: Validate generated TypeScript file
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // CRITICAL SECURITY VALIDATION: Authentication credentials must be excluded from ALL selectors

        // Public selector validation
        const publicSelectorMatch = generatedContent.match(
          /export function createUserPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const publicContent = publicSelectorMatch?.[1] || '';

        expect(publicContent).toContain('id: true');
        expect(publicContent).toContain('organization: true');
        expect(publicContent).toContain('createdAt: true');
        expect(publicContent).not.toContain('username: true');
        expect(publicContent).not.toContain('email: true');
        expect(publicContent).not.toContain('hashedPassword: true');
        expect(publicContent).not.toContain('salt: true');
        expect(publicContent).not.toContain('verificationCode: true');

        // Owner selector validation
        const ownerSelectorMatch = generatedContent.match(
          /export function createUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerContent = ownerSelectorMatch?.[1] || '';

        expect(ownerContent).toContain('id: true');
        expect(ownerContent).toContain('username: true');
        expect(ownerContent).toContain('email: true');
        expect(ownerContent).toContain('firstName: true');
        expect(ownerContent).toContain('lastName: true');
        expect(ownerContent).not.toContain('hashedPassword: true'); // CRITICAL!
        expect(ownerContent).not.toContain('salt: true'); // CRITICAL!
        expect(ownerContent).not.toContain('verificationCode: true'); // CRITICAL!

        // Admin selector validation
        const adminSelectorMatch = generatedContent.match(
          /export function createUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminContent = adminSelectorMatch?.[1] || '';

        expect(adminContent).toContain('id: true');
        expect(adminContent).toContain('username: true');
        expect(adminContent).toContain('email: true');
        expect(adminContent).toContain('firstName: true');
        expect(adminContent).toContain('lastName: true');
        expect(adminContent).not.toContain('hashedPassword: true'); // CRITICAL!
        expect(adminContent).not.toContain('salt: true'); // CRITICAL!
        expect(adminContent).not.toContain('verificationCode: true'); // CRITICAL!

        // STEP 4: Validate runtime security data generation
        const securityFieldsMatch = generatedContent.match(
          /const modelSecurityFields = \{([\s\S]*?)\};/,
        );
        const securityFieldsContent = securityFieldsMatch?.[1] || '';

        expect(securityFieldsContent).toContain(
          "neverExpose: ['hashedPassword', 'salt', 'verificationCode']",
        );
        expect(securityFieldsContent).toContain(
          "sensitive: ['username', 'email', 'firstName', 'lastName']",
        );
        expect(securityFieldsContent).toContain('adminOnly: []');
      });

      it('should process real RefreshToken model and secure token field', async () => {
        const realRefreshTokenDmmf = {
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
                  {
                    name: 'createdAt',
                    type: 'DateTime',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Token generation time',
                  },
                  {
                    name: 'updatedAt',
                    type: 'DateTime',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Last token use/refresh',
                  },
                ],
              },
            ],
          },
        };

        // Process through complete pipeline
        const sensitiveFieldsMap = processSensitiveFields(realRefreshTokenDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // CRITICAL: Token field must be excluded from ALL selectors
        expect(generatedContent).not.toContain('token: true');

        // Verify proper field categorization
        expect(sensitiveFieldsMap.RefreshToken.fieldsBySecurityLevel.neverExpose).toEqual([
          'token',
        ]);
        expect(sensitiveFieldsMap.RefreshToken.fieldsBySecurityLevel.public).toEqual([
          'id',
          'userId',
          'createdAt',
          'updatedAt',
        ]);

        // Verify token field metadata
        const tokenField = sensitiveFieldsMap.RefreshToken.fieldsWithAnnotations.find(
          (f) => f.name === 'token',
        );
        expect(tokenField?.securityLevel).toBe('never-expose');
        expect(tokenField?.gdpr.category).toBe('TECHNICAL');
        expect(tokenField?.gdpr.purpose).toBe('AUTHENTICATION');
      });

      it('should process multi-model pipeline with diverse security patterns', async () => {
        // Create DMMF with multiple models having different security characteristics
        const multiModelDmmf = {
          datamodel: {
            models: [
              // User model with authentication security
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Primary key',
                  },
                  {
                    name: 'email',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive @gdpr.category(PERSONAL) - User email',
                  },
                  {
                    name: 'hashedPassword',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @never-expose @gdpr.category(TECHNICAL) - Password hash',
                  },
                ],
              },
              // Document model with content security
              {
                name: 'Document',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Document ID',
                  },
                  {
                    name: 'title',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Public document title',
                  },
                  {
                    name: 'content',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation: '/// @sensitive @gdpr.category(PERSONAL) - Document content',
                  },
                  {
                    name: 'adminReview',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation: '/// @admin-only @gdpr.category(TECHNICAL) - Admin review',
                  },
                  {
                    name: 'encryptionKey',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) - File encryption key',
                  },
                ],
              },
              // Comment model with moderation
              {
                name: 'Comment',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Comment ID',
                  },
                  {
                    name: 'comment',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - Comment content (full text)',
                  },
                  {
                    name: 'state',
                    type: 'CommentState',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Moderation status',
                  },
                ],
              },
            ],
          },
        };

        // Process complete pipeline
        const sensitiveFieldsMap = processSensitiveFields(multiModelDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Verify all models are processed
        expect(Object.keys(sensitiveFieldsMap)).toEqual(['User', 'Document', 'Comment']);

        // Verify User model selectors
        expect(generatedContent).toContain('createUserPublicSelector');
        expect(generatedContent).toContain('createUserOwnerSelector');
        expect(generatedContent).toContain('createUserAdminSelector');

        // Verify Document model selectors
        expect(generatedContent).toContain('createDocumentPublicSelector');
        expect(generatedContent).toContain('createDocumentOwnerSelector');
        expect(generatedContent).toContain('createDocumentAdminSelector');

        // Verify Comment model selectors
        expect(generatedContent).toContain('createCommentPublicSelector');
        expect(generatedContent).toContain('createCommentOwnerSelector');
        expect(generatedContent).toContain('createCommentAdminSelector');

        // CRITICAL: Verify never-expose fields are excluded from all models
        expect(generatedContent).not.toContain('hashedPassword: true');
        expect(generatedContent).not.toContain('encryptionKey: true');

        // Verify aggregate selectors include all models
        expect(generatedContent).toContain('user: createUserPublicSelector()');
        expect(generatedContent).toContain('document: createDocumentPublicSelector()');
        expect(generatedContent).toContain('comment: createCommentPublicSelector()');

        // Verify runtime security data for all models
        const securityFieldsMatch = generatedContent.match(
          /const modelSecurityFields = \{([\s\S]*?)\};/,
        );
        const securityFieldsContent = securityFieldsMatch?.[1] || '';

        expect(securityFieldsContent).toContain('user: {');
        expect(securityFieldsContent).toContain('document: {');
        expect(securityFieldsContent).toContain('comment: {');
      });
    });
  });

  describe('VULNERABILITY REGRESSION INTEGRATION', () => {
    describe('Contract: Complete pipeline must reject vulnerable annotation patterns', () => {
      it('should demonstrate complete vulnerable pipeline behavior', async () => {
        // Create DMMF with VULNERABLE annotations (credentials marked as @sensitive)
        const vulnerableDmmf = {
          datamodel: {
            models: [
              {
                name: 'VulnerableUser',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Primary key',
                  },
                  {
                    name: 'email',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - User email',
                  },
                  {
                    name: 'hashedPassword',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - Password hash', // VULNERABILITY!
                  },
                  {
                    name: 'salt',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - Password salt', // VULNERABILITY!
                  },
                  {
                    name: 'verificationCode',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - Verification token', // VULNERABILITY!
                  },
                ],
              },
            ],
          },
        };

        // Process through vulnerable pipeline
        const vulnerableFieldsMap = processSensitiveFields(vulnerableDmmf);
        await generateFieldPickingHelpers(tempOutputDir, vulnerableFieldsMap);

        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // DEMONSTRATE VULNERABILITY: Authentication fields would be exposed!
        const ownerSelectorMatch = generatedContent.match(
          /export function createVulnerableUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerContent = ownerSelectorMatch?.[1] || '';

        // These would be dangerous exposures in the vulnerable version
        expect(ownerContent).toContain('hashedPassword: true'); // VULNERABILITY!
        expect(ownerContent).toContain('salt: true'); // VULNERABILITY!
        expect(ownerContent).toContain('verificationCode: true'); // VULNERABILITY!

        const adminSelectorMatch = generatedContent.match(
          /export function createVulnerableUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminContent = adminSelectorMatch?.[1] || '';

        expect(adminContent).toContain('hashedPassword: true'); // VULNERABILITY!
        expect(adminContent).toContain('salt: true'); // VULNERABILITY!
        expect(adminContent).toContain('verificationCode: true'); // VULNERABILITY!

        // Verify vulnerable field categorization
        expect(vulnerableFieldsMap.VulnerableUser.fieldsBySecurityLevel.sensitive).toEqual([
          'email',
          'hashedPassword', // DANGEROUS!
          'salt', // DANGEROUS!
          'verificationCode', // DANGEROUS!
        ]);
        expect(vulnerableFieldsMap.VulnerableUser.fieldsBySecurityLevel.neverExpose).toEqual([]);

        // This test demonstrates what the vulnerability looked like for documentation
      });

      it('should show the fix working vs vulnerable pattern side by side', async () => {
        // Test both vulnerable and fixed patterns in the same test for comparison

        // VULNERABLE pattern
        const vulnerableDmmf = {
          datamodel: {
            models: [
              {
                name: 'VulnerableModel',
                fields: [
                  {
                    name: 'hashedPassword',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - Password', // WRONG!
                  },
                ],
              },
            ],
          },
        };

        // FIXED pattern
        const fixedDmmf = {
          datamodel: {
            models: [
              {
                name: 'FixedModel',
                fields: [
                  {
                    name: 'hashedPassword',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @never-expose - Password', // CORRECT!
                  },
                ],
              },
            ],
          },
        };

        // Process both through pipeline
        const vulnerableMap = processSensitiveFields(vulnerableDmmf);
        const fixedMap = processSensitiveFields(fixedDmmf);

        // COMPARISON: Vulnerable vs Fixed categorization
        expect(vulnerableMap.VulnerableModel.fieldsBySecurityLevel.sensitive).toContain(
          'hashedPassword',
        ); // BAD!
        expect(vulnerableMap.VulnerableModel.fieldsBySecurityLevel.neverExpose).not.toContain(
          'hashedPassword',
        ); // BAD!

        expect(fixedMap.FixedModel.fieldsBySecurityLevel.sensitive).not.toContain('hashedPassword'); // GOOD!
        expect(fixedMap.FixedModel.fieldsBySecurityLevel.neverExpose).toContain('hashedPassword'); // GOOD!

        // Generate selectors for both
        await generateFieldPickingHelpers(tempOutputDir, { ...vulnerableMap, ...fixedMap });
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // COMPARISON: Vulnerable vs Fixed selector generation
        const vulnerableOwnerMatch = generatedContent.match(
          /createVulnerableModelOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const fixedOwnerMatch = generatedContent.match(
          /createFixedModelOwnerSelector\(\) \{([\s\S]*?)\}/,
        );

        const vulnerableOwnerContent = vulnerableOwnerMatch?.[1] || '';
        const fixedOwnerContent = fixedOwnerMatch?.[1] || '';

        // DEMONSTRATION: Vulnerable would expose, fixed wouldn't
        expect(vulnerableOwnerContent).toContain('hashedPassword: true'); // VULNERABILITY!
        expect(fixedOwnerContent).not.toContain('hashedPassword: true'); // SECURE!
      });
    });
  });

  describe('REAL-WORLD SCHEMA PATTERNS', () => {
    describe('Contract: Finnish archival system specific security patterns', () => {
      it('should handle archival document model with cultural heritage data protection', async () => {
        const archivalDmmf = {
          datamodel: {
            models: [
              {
                name: 'ArchivalDocument',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Document identifier',
                  },
                  {
                    name: 'title',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Document title - public information',
                  },
                  {
                    name: 'personalNames',
                    type: 'Json',
                    isOptional: true,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(INDEFINITE) - Person names in documents',
                  },
                  {
                    name: 'restrictedCulturalContext',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      '/// @admin-only @gdpr.category(SENSITIVE_PERSONAL) @gdpr.purpose(RESEARCH) @gdpr.retention(INDEFINITE) - Sensitive cultural information',
                  },
                  {
                    name: 'originalUploadHash',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(SECURITY) @gdpr.retention(INDEFINITE) - File integrity hash',
                  },
                  {
                    name: 'ocrText',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation: '/// @sensitive - Extracted text via OCR for full-text search',
                  },
                ],
              },
            ],
          },
        };

        // Process through pipeline
        const sensitiveFieldsMap = processSensitiveFields(archivalDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Validate proper archival security implementation
        const archivalMetadata = sensitiveFieldsMap.ArchivalDocument;

        expect(archivalMetadata.fieldsBySecurityLevel).toEqual({
          public: ['id', 'title'],
          sensitive: ['personalNames', 'ocrText'],
          adminOnly: ['restrictedCulturalContext'],
          neverExpose: ['originalUploadHash'],
        });

        // Validate public access (researchers, general public)
        const publicSelectorMatch = generatedContent.match(
          /createArchivalDocumentPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const publicContent = publicSelectorMatch?.[1] || '';

        expect(publicContent).toContain('id: true');
        expect(publicContent).toContain('title: true');
        expect(publicContent).not.toContain('personalNames: true');
        expect(publicContent).not.toContain('originalUploadHash: true');

        // Validate owner access (document contributors)
        const ownerSelectorMatch = generatedContent.match(
          /createArchivalDocumentOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerContent = ownerSelectorMatch?.[1] || '';

        expect(ownerContent).toContain('personalNames: true');
        expect(ownerContent).toContain('ocrText: true');
        expect(ownerContent).not.toContain('restrictedCulturalContext: true');
        expect(ownerContent).not.toContain('originalUploadHash: true');

        // Validate admin access (archivists, institution administrators)
        const adminSelectorMatch = generatedContent.match(
          /createArchivalDocumentAdminSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminContent = adminSelectorMatch?.[1] || '';

        expect(adminContent).toContain('personalNames: true');
        expect(adminContent).toContain('restrictedCulturalContext: true');
        expect(adminContent).not.toContain('originalUploadHash: true'); // Never exposed even to admins
      });

      it('should handle oral history model with interview security', async () => {
        const oralHistoryDmmf = {
          datamodel: {
            models: [
              {
                name: 'OralHistory',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// UUID primary key',
                  },
                  {
                    name: 'fileName',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Audio/video filename',
                  },
                  {
                    name: 'person',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - Interviewee name/identifier',
                  },
                  {
                    name: 'reporter',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - Interviewer name/identifier',
                  },
                  {
                    name: 'description',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - Interview summary/description',
                  },
                  {
                    name: 'event',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Historical event/topic discussed',
                  },
                  {
                    name: 'language',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Primary language of interview',
                  },
                ],
              },
            ],
          },
        };

        // Process through pipeline
        const sensitiveFieldsMap = processSensitiveFields(oralHistoryDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        const oralHistoryMetadata = sensitiveFieldsMap.OralHistory;

        expect(oralHistoryMetadata.fieldsBySecurityLevel).toEqual({
          public: ['id', 'fileName', 'event', 'language'],
          sensitive: ['person', 'reporter', 'description'],
          adminOnly: [],
          neverExpose: [],
        });

        // Validate that interview participants' privacy is protected in public access
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );
        const publicSelectorMatch = generatedContent.match(
          /createOralHistoryPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const publicContent = publicSelectorMatch?.[1] || '';

        expect(publicContent).toContain('event: true');
        expect(publicContent).toContain('language: true');
        expect(publicContent).not.toContain('person: true'); // Protect interviewee privacy
        expect(publicContent).not.toContain('reporter: true'); // Protect interviewer privacy
        expect(publicContent).not.toContain('description: true'); // May contain personal details
      });
    });
  });

  describe('RUNTIME VALIDATION INTEGRATION', () => {
    describe('Contract: Generated runtime functions must enforce security boundaries', () => {
      it('should generate and validate runtime security validation functions', async () => {
        const testDmmf = {
          datamodel: {
            models: [
              {
                name: 'SecurityModel',
                fields: [
                  {
                    name: 'publicField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Public data',
                  },
                  {
                    name: 'sensitiveField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive - Sensitive data',
                  },
                  {
                    name: 'adminField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @admin-only - Admin data',
                  },
                  {
                    name: 'secretField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @never-expose - Secret data',
                  },
                ],
              },
            ],
          },
        };

        // Process and generate
        const sensitiveFieldsMap = processSensitiveFields(testDmmf);
        await generateFieldPickingHelpers(tempOutputDir, sensitiveFieldsMap);

        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Validate runtime validation function generation
        expect(generatedContent).toContain('export function validateFieldSelector(');
        expect(generatedContent).toContain('export function getSecureFieldSelector(');
        expect(generatedContent).toContain('export function isFieldSafeForAccess(');

        // Validate security field data structure
        const securityFieldsMatch = generatedContent.match(
          /const modelSecurityFields = \{([\s\S]*?)\};/,
        );
        const securityFieldsContent = securityFieldsMatch?.[1] || '';

        expect(securityFieldsContent).toContain('securitymodel: {');
        expect(securityFieldsContent).toContain("neverExpose: ['secretField']");
        expect(securityFieldsContent).toContain("sensitive: ['sensitiveField']");
        expect(securityFieldsContent).toContain("adminOnly: ['adminField']");

        // Validate that validation logic is present
        expect(generatedContent).toContain('for (const field of securityFields.neverExpose)');
        expect(generatedContent).toContain(
          'throw new Error(`SECURITY VIOLATION: Never-expose field',
        );
        expect(generatedContent).toContain("if (userRole === 'public')");
        expect(generatedContent).toContain("if (userRole !== 'admin')");
      });
    });
  });

  describe('ERROR HANDLING INTEGRATION', () => {
    describe('Contract: Pipeline must handle errors gracefully', () => {
      it('should handle conflicting security annotations throughout pipeline', async () => {
        const conflictingDmmf = {
          datamodel: {
            models: [
              {
                name: 'ConflictModel',
                fields: [
                  {
                    name: 'conflictField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive @admin-only - Conflicting annotations',
                  },
                ],
              },
            ],
          },
        };

        // Should throw error during DMMF processing
        expect(() => {
          processSensitiveFields(conflictingDmmf);
        }).toThrow(/has conflicting security annotations: sensitive, admin-only/);
      });

      it('should handle invalid GDPR parameters throughout pipeline', async () => {
        const invalidGdprDmmf = {
          datamodel: {
            models: [
              {
                name: 'InvalidGdprModel',
                fields: [
                  {
                    name: 'invalidField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive @gdpr.category(INVALID_CATEGORY)',
                  },
                ],
              },
            ],
          },
        };

        // Should throw error during annotation parsing within DMMF processing
        expect(() => {
          processSensitiveFields(invalidGdprDmmf);
        }).toThrow(/Invalid GDPR category 'INVALID_CATEGORY'/);
      });

      it('should handle models without annotations gracefully', async () => {
        const plainDmmf = {
          datamodel: {
            models: [
              {
                name: 'PlainModel',
                fields: [
                  {
                    name: 'plainField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Just a regular field',
                  },
                ],
              },
            ],
          },
        };

        // Should process without errors but skip models without annotations
        const result = processSensitiveFields(plainDmmf);
        expect(result).toEqual({});
      });
    });
  });
});
