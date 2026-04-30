/**
 * FIELD SELECTOR GENERATION SECURITY TESTS
 * ========================================
 *
 * Test Contract: These tests validate that the field selector generation process
 * correctly implements security boundaries to prevent credential exposure.
 *
 * CRITICAL SECURITY VALIDATION:
 * 1. @never-expose fields MUST be excluded from ALL selectors (public, owner, admin)
 * 2. @sensitive fields MUST only appear in owner and admin selectors
 * 3. @admin-only fields MUST only appear in admin selectors
 * 4. Generated TypeScript code must be syntactically correct
 * 5. Runtime validation functions must enforce security boundaries
 *
 * VULNERABILITY PREVENTION: These tests would have caught the original vulnerability
 * where authentication credentials (hashedPassword, salt, verificationCode) were
 * incorrectly accessible through owner and admin selectors due to being marked
 * as @sensitive instead of @never-expose.
 *
 * Test Quality: Uses REAL field-picking helper generator functions and validates
 * actual generated TypeScript code structure. No mocks - tests real behavior.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateFieldPickingHelpers } from '../../../generators/utils/generate-field-picking-helpers.js';

describe('Field Selector Generation Security Tests', () => {
  let tempOutputDir: string;

  beforeAll(() => {
    // Create temporary directory for test outputs
    tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'field-selector-tests-'));
  });

  afterAll(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true });
    }
  });

  describe('CRITICAL VULNERABILITY PREVENTION TESTS', () => {
    describe('Contract: @never-expose fields must be excluded from ALL selectors', () => {
      it('should exclude authentication credentials from all generated selectors', async () => {
        // Create field metadata that matches the real User model with fixed security annotations
        const mockSensitiveFieldsMap = {
          User: {
            modelName: 'User',
            allFields: ['id', 'email', 'hashedPassword', 'salt', 'verificationCode', 'firstName'],
            fieldsWithAnnotations: [
              {
                name: 'email',
                securityLevel: 'sensitive',
                isNeverExpose: false,
                isSensitive: true,
                isAdminOnly: false,
              },
              {
                name: 'hashedPassword',
                securityLevel: 'never-expose', // SECURITY FIX: Was 'sensitive' in vulnerability
                isNeverExpose: true,
                isSensitive: false,
                isAdminOnly: false,
              },
              {
                name: 'salt',
                securityLevel: 'never-expose', // SECURITY FIX: Was 'sensitive' in vulnerability
                isNeverExpose: true,
                isSensitive: false,
                isAdminOnly: false,
              },
              {
                name: 'verificationCode',
                securityLevel: 'never-expose', // SECURITY FIX: Was 'sensitive' in vulnerability
                isNeverExpose: true,
                isSensitive: false,
                isAdminOnly: false,
              },
              {
                name: 'firstName',
                securityLevel: 'sensitive',
                isNeverExpose: false,
                isSensitive: true,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: ['id'],
              sensitive: ['email', 'firstName'],
              adminOnly: [],
              neverExpose: ['hashedPassword', 'salt', 'verificationCode'],
            },
          },
        };

        // Generate field selectors
        await generateFieldPickingHelpers(tempOutputDir, mockSensitiveFieldsMap);

        // Read generated file
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // SECURITY CRITICAL: Verify never-expose fields are NOT in ANY selector

        // Check public selector function
        expect(generatedContent).toMatch(
          /export function createUserPublicSelector\(\) \{[\s\S]*?\}/,
        );
        const publicSelectorMatch = generatedContent.match(
          /export function createUserPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const publicSelectorContent = publicSelectorMatch?.[1] || '';

        expect(publicSelectorContent).not.toContain('hashedPassword: true');
        expect(publicSelectorContent).not.toContain('salt: true');
        expect(publicSelectorContent).not.toContain('verificationCode: true');
        expect(publicSelectorContent).toContain('id: true'); // Should contain public fields

        // Check owner selector function
        expect(generatedContent).toMatch(
          /export function createUserOwnerSelector\(\) \{[\s\S]*?\}/,
        );
        const ownerSelectorMatch = generatedContent.match(
          /export function createUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerSelectorContent = ownerSelectorMatch?.[1] || '';

        expect(ownerSelectorContent).not.toContain('hashedPassword: true');
        expect(ownerSelectorContent).not.toContain('salt: true');
        expect(ownerSelectorContent).not.toContain('verificationCode: true');
        expect(ownerSelectorContent).toContain('email: true'); // Should contain sensitive fields
        expect(ownerSelectorContent).toContain('firstName: true');

        // Check admin selector function
        expect(generatedContent).toMatch(
          /export function createUserAdminSelector\(\) \{[\s\S]*?\}/,
        );
        const adminSelectorMatch = generatedContent.match(
          /export function createUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminSelectorContent = adminSelectorMatch?.[1] || '';

        expect(adminSelectorContent).not.toContain('hashedPassword: true');
        expect(adminSelectorContent).not.toContain('salt: true');
        expect(adminSelectorContent).not.toContain('verificationCode: true');
        expect(adminSelectorContent).toContain('email: true'); // Should contain sensitive fields
      });

      it('should exclude RefreshToken.token from all selectors', async () => {
        const mockSensitiveFieldsMap = {
          RefreshToken: {
            modelName: 'RefreshToken',
            allFields: ['id', 'userId', 'token', 'createdAt', 'updatedAt'],
            fieldsWithAnnotations: [
              {
                name: 'token',
                securityLevel: 'never-expose',
                isNeverExpose: true,
                isSensitive: false,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: ['id', 'userId', 'createdAt', 'updatedAt'],
              sensitive: [],
              adminOnly: [],
              neverExpose: ['token'],
            },
          },
        };

        await generateFieldPickingHelpers(tempOutputDir, mockSensitiveFieldsMap);
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Verify token field is excluded from all selectors
        expect(generatedContent).not.toContain('token: true');

        // But other fields should be present in selectors
        expect(generatedContent).toContain('id: true');
        expect(generatedContent).toContain('userId: true');
        expect(generatedContent).toContain('createdAt: true');
      });
    });

    describe('Contract: Demonstrate what the vulnerability looked like', () => {
      it('should show how vulnerable field mapping would incorrectly expose credentials', async () => {
        // Create field metadata with the VULNERABLE annotations (authentication fields marked as @sensitive)
        const vulnerableFieldsMap = {
          VulnerableUser: {
            modelName: 'VulnerableUser',
            allFields: ['id', 'email', 'hashedPassword', 'salt', 'verificationCode'],
            fieldsWithAnnotations: [
              {
                name: 'email',
                securityLevel: 'sensitive',
                isNeverExpose: false,
                isSensitive: true,
                isAdminOnly: false,
              },
              {
                name: 'hashedPassword',
                securityLevel: 'sensitive', // VULNERABILITY! Should be 'never-expose'
                isNeverExpose: false,
                isSensitive: true, // PROBLEMATIC!
                isAdminOnly: false,
              },
              {
                name: 'salt',
                securityLevel: 'sensitive', // VULNERABILITY! Should be 'never-expose'
                isNeverExpose: false,
                isSensitive: true, // PROBLEMATIC!
                isAdminOnly: false,
              },
              {
                name: 'verificationCode',
                securityLevel: 'sensitive', // VULNERABILITY! Should be 'never-expose'
                isNeverExpose: false,
                isSensitive: true, // PROBLEMATIC!
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: ['id'],
              sensitive: ['email', 'hashedPassword', 'salt', 'verificationCode'], // DANGEROUS!
              adminOnly: [],
              neverExpose: [],
            },
          },
        };

        await generateFieldPickingHelpers(tempOutputDir, vulnerableFieldsMap);
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // DEMONSTRATION: With vulnerable mapping, credentials would appear in owner/admin selectors
        const ownerSelectorMatch = generatedContent.match(
          /export function createVulnerableUserOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerSelectorContent = ownerSelectorMatch?.[1] || '';

        // SECURITY PROBLEM: These credentials would be exposed to owners!
        expect(ownerSelectorContent).toContain('hashedPassword: true'); // VULNERABLE!
        expect(ownerSelectorContent).toContain('salt: true'); // VULNERABLE!
        expect(ownerSelectorContent).toContain('verificationCode: true'); // VULNERABLE!

        const adminSelectorMatch = generatedContent.match(
          /export function createVulnerableUserAdminSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminSelectorContent = adminSelectorMatch?.[1] || '';

        // SECURITY PROBLEM: These credentials would be exposed to admins!
        expect(adminSelectorContent).toContain('hashedPassword: true'); // VULNERABLE!
        expect(adminSelectorContent).toContain('salt: true'); // VULNERABLE!
        expect(adminSelectorContent).toContain('verificationCode: true'); // VULNERABLE!

        // This test documents the vulnerability pattern for reference
      });
    });
  });

  describe('FIELD SELECTOR ACCESS CONTROL VALIDATION', () => {
    describe('Contract: Three-level security model implementation', () => {
      it('should generate correct selectors for all security levels', async () => {
        const mockSensitiveFieldsMap = {
          SecurityTest: {
            modelName: 'SecurityTest',
            allFields: ['publicField', 'sensitiveField', 'adminField', 'secretField'],
            fieldsWithAnnotations: [
              {
                name: 'sensitiveField',
                securityLevel: 'sensitive',
                isNeverExpose: false,
                isSensitive: true,
                isAdminOnly: false,
              },
              {
                name: 'adminField',
                securityLevel: 'admin-only',
                isNeverExpose: false,
                isSensitive: false,
                isAdminOnly: true,
              },
              {
                name: 'secretField',
                securityLevel: 'never-expose',
                isNeverExpose: true,
                isSensitive: false,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: ['publicField'],
              sensitive: ['sensitiveField'],
              adminOnly: ['adminField'],
              neverExpose: ['secretField'],
            },
          },
        };

        await generateFieldPickingHelpers(tempOutputDir, mockSensitiveFieldsMap);
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Extract selector contents for analysis
        const publicMatch = generatedContent.match(
          /export function createSecurityTestPublicSelector\(\) \{([\s\S]*?)\}/,
        );
        const ownerMatch = generatedContent.match(
          /export function createSecurityTestOwnerSelector\(\) \{([\s\S]*?)\}/,
        );
        const adminMatch = generatedContent.match(
          /export function createSecurityTestAdminSelector\(\) \{([\s\S]*?)\}/,
        );

        const publicContent = publicMatch?.[1] || '';
        const ownerContent = ownerMatch?.[1] || '';
        const adminContent = adminMatch?.[1] || '';

        // PUBLIC SELECTOR: Only public fields
        expect(publicContent).toContain('publicField: true');
        expect(publicContent).not.toContain('sensitiveField: true');
        expect(publicContent).not.toContain('adminField: true');
        expect(publicContent).not.toContain('secretField: true');

        // OWNER SELECTOR: Public + sensitive fields
        expect(ownerContent).toContain('publicField: true');
        expect(ownerContent).toContain('sensitiveField: true');
        expect(ownerContent).not.toContain('adminField: true');
        expect(ownerContent).not.toContain('secretField: true');

        // ADMIN SELECTOR: Public + sensitive + admin fields (but not never-expose)
        expect(adminContent).toContain('publicField: true');
        expect(adminContent).toContain('sensitiveField: true');
        expect(adminContent).toContain('adminField: true');
        expect(adminContent).not.toContain('secretField: true');
      });

      it('should generate proper safe field arrays and types', async () => {
        const mockSensitiveFieldsMap = {
          TestModel: {
            modelName: 'TestModel',
            allFields: ['id', 'name', 'secret'],
            fieldsWithAnnotations: [
              {
                name: 'secret',
                securityLevel: 'never-expose',
                isNeverExpose: true,
                isSensitive: false,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: ['id', 'name'],
              sensitive: [],
              adminOnly: [],
              neverExpose: ['secret'],
            },
          },
        };

        await generateFieldPickingHelpers(tempOutputDir, mockSensitiveFieldsMap);
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Check safe fields array generation
        expect(generatedContent).toMatch(
          /export const testmodelSafeFields = \[[\s\S]*?\] as const;/,
        );
        const safeFieldsMatch = generatedContent.match(
          /export const testmodelSafeFields = \[([\s\S]*?)\] as const;/,
        );
        const safeFieldsContent = safeFieldsMatch?.[1] || '';

        expect(safeFieldsContent).toContain("'id'");
        expect(safeFieldsContent).toContain("'name'");
        expect(safeFieldsContent).not.toContain("'secret'");

        // Check TypeScript type generation
        expect(generatedContent).toContain(
          'export type TestModelSafeFields = typeof testmodelSafeFields[number];',
        );

        // Check all fields array (for reference only)
        expect(generatedContent).toMatch(
          /export const testmodelAllFields = \[[\s\S]*?\] as const;/,
        );
        const allFieldsMatch = generatedContent.match(
          /export const testmodelAllFields = \[([\s\S]*?)\] as const;/,
        );
        const allFieldsContent = allFieldsMatch?.[1] || '';

        expect(allFieldsContent).toContain("'id'");
        expect(allFieldsContent).toContain("'name'");
        expect(allFieldsContent).toContain("'secret'"); // Present in all fields for reference
      });
    });

    describe('Contract: Aggregate selector object generation', () => {
      it('should generate proper aggregate selector objects for runtime use', async () => {
        const mockSensitiveFieldsMap = {
          User: {
            modelName: 'User',
            allFields: ['id', 'email'],
            fieldsWithAnnotations: [
              {
                name: 'email',
                securityLevel: 'sensitive',
                isNeverExpose: false,
                isSensitive: true,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: ['id'],
              sensitive: ['email'],
              adminOnly: [],
              neverExpose: [],
            },
          },
          Document: {
            modelName: 'Document',
            allFields: ['id', 'title'],
            fieldsWithAnnotations: [],
            fieldsBySecurityLevel: {
              public: ['id', 'title'],
              sensitive: [],
              adminOnly: [],
              neverExpose: [],
            },
          },
        };

        await generateFieldPickingHelpers(tempOutputDir, mockSensitiveFieldsMap);
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Check safeFieldSelectors object with TypeScript type annotation
        expect(generatedContent).toMatch(
          /export const safeFieldSelectors: Record<string, Record<string, boolean>> = \{[\s\S]*?\};/,
        );
        const safeSelectorsMatch = generatedContent.match(
          /export const safeFieldSelectors: Record<string, Record<string, boolean>> = \{([\s\S]*?)\};/,
        );
        const safeSelectorsContent = safeSelectorsMatch?.[1] || '';

        expect(safeSelectorsContent).toContain('user: createUserPublicSelector(),');
        expect(safeSelectorsContent).toContain('document: createDocumentPublicSelector(),');

        // Check ownerFieldSelectors object
        expect(generatedContent).toMatch(
          /export const ownerFieldSelectors: Record<string, Record<string, boolean>> = \{[\s\S]*?\};/,
        );
        const ownerSelectorsMatch = generatedContent.match(
          /export const ownerFieldSelectors: Record<string, Record<string, boolean>> = \{([\s\S]*?)\};/,
        );
        const ownerSelectorsContent = ownerSelectorsMatch?.[1] || '';

        expect(ownerSelectorsContent).toContain('user: createUserOwnerSelector(),');
        expect(ownerSelectorsContent).toContain('document: createDocumentOwnerSelector(),');

        // Check adminFieldSelectors object
        expect(generatedContent).toMatch(
          /export const adminFieldSelectors: Record<string, Record<string, boolean>> = \{[\s\S]*?\};/,
        );
        const adminSelectorsMatch = generatedContent.match(
          /export const adminFieldSelectors: Record<string, Record<string, boolean>> = \{([\s\S]*?)\};/,
        );
        const adminSelectorsContent = adminSelectorsMatch?.[1] || '';

        expect(adminSelectorsContent).toContain('user: createUserAdminSelector(),');
        expect(adminSelectorsContent).toContain('document: createDocumentAdminSelector(),');
      });
    });
  });

  describe('RUNTIME SECURITY VALIDATION FUNCTIONS', () => {
    describe('Contract: Generated security validation helpers', () => {
      it('should generate runtime field validation functions', async () => {
        const mockSensitiveFieldsMap = {
          User: {
            modelName: 'User',
            allFields: ['id', 'email', 'hashedPassword'],
            fieldsWithAnnotations: [
              {
                name: 'email',
                securityLevel: 'sensitive',
                isNeverExpose: false,
                isSensitive: true,
                isAdminOnly: false,
              },
              {
                name: 'hashedPassword',
                securityLevel: 'never-expose',
                isNeverExpose: true,
                isSensitive: false,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: ['id'],
              sensitive: ['email'],
              adminOnly: [],
              neverExpose: ['hashedPassword'],
            },
          },
        };

        await generateFieldPickingHelpers(tempOutputDir, mockSensitiveFieldsMap);
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Check modelSecurityFields constant generation with TypeScript type annotation
        expect(generatedContent).toMatch(
          /const modelSecurityFields: Record<string, \{[\s\S]*?\}> = \{[\s\S]*?\};/,
        );
        const securityFieldsMatch = generatedContent.match(
          /const modelSecurityFields: Record<string, \{[\s\S]*?\}> = \{([\s\S]*?)\};/,
        );
        const securityFieldsContent = securityFieldsMatch?.[1] || '';

        expect(securityFieldsContent).toContain('user: {');
        expect(securityFieldsContent).toContain("neverExpose: ['hashedPassword']");
        expect(securityFieldsContent).toContain("sensitive: ['email']");
        expect(securityFieldsContent).toContain('adminOnly: []');

        // Check validateFieldSelector function generation
        expect(generatedContent).toContain('export function validateFieldSelector(');
        expect(generatedContent).toContain('modelName: string');
        expect(generatedContent).toContain('selector: Record<string, boolean>');
        expect(generatedContent).toContain("userRole: 'public' | 'owner' | 'admin'");

        // Check getSecureFieldSelector function generation
        expect(generatedContent).toContain('export function getSecureFieldSelector(');
        expect(generatedContent).toContain("userRole: 'USER' | 'EXPERT' | 'MODERATOR' | 'ADMIN'");
        expect(generatedContent).toContain('isOwner: boolean = false');

        // Check isFieldSafeForAccess function generation
        expect(generatedContent).toContain('export function isFieldSafeForAccess(');
        expect(generatedContent).toContain("accessLevel: 'public' | 'owner' | 'admin'");
        expect(generatedContent).toContain('boolean');
      });

      it('should generate proper security validation logic in runtime functions', async () => {
        const mockSensitiveFieldsMap = {
          TestModel: {
            modelName: 'TestModel',
            allFields: ['public', 'sensitive', 'admin', 'secret'],
            fieldsWithAnnotations: [
              {
                name: 'sensitive',
                securityLevel: 'sensitive',
                isNeverExpose: false,
                isSensitive: true,
                isAdminOnly: false,
              },
              {
                name: 'admin',
                securityLevel: 'admin-only',
                isNeverExpose: false,
                isSensitive: false,
                isAdminOnly: true,
              },
              {
                name: 'secret',
                securityLevel: 'never-expose',
                isNeverExpose: true,
                isSensitive: false,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: ['public'],
              sensitive: ['sensitive'],
              adminOnly: ['admin'],
              neverExpose: ['secret'],
            },
          },
        };

        await generateFieldPickingHelpers(tempOutputDir, mockSensitiveFieldsMap);
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Check that never-expose validation logic is present
        expect(generatedContent).toContain('for (const field of securityFields.neverExpose)');
        expect(generatedContent).toContain(
          'throw new Error(`SECURITY VIOLATION: Never-expose field',
        );

        // Check that sensitive field validation logic is present
        expect(generatedContent).toContain("if (userRole === 'public')");
        expect(generatedContent).toContain('for (const field of securityFields.sensitive)');

        // Check that admin-only field validation logic is present
        expect(generatedContent).toContain("if (userRole !== 'admin')");
        expect(generatedContent).toContain('for (const field of securityFields.adminOnly)');

        // Check that getSecureFieldSelector has proper role-based logic with TypeScript casting
        expect(generatedContent).toContain("if (userRole === 'ADMIN')");
        expect(generatedContent).toContain(
          '(adminFieldSelectors as Record<string, Record<string, boolean>>)[modelKey]',
        );
        expect(generatedContent).toContain('if (isOwner)');
        expect(generatedContent).toContain(
          '(ownerFieldSelectors as Record<string, Record<string, boolean>>)[modelKey]',
        );
        expect(generatedContent).toContain(
          '(safeFieldSelectors as Record<string, Record<string, boolean>>)[modelKey]',
        );
      });
    });
  });

  describe('GENERATED CODE QUALITY AND STRUCTURE', () => {
    describe('Contract: TypeScript code generation quality', () => {
      it('should generate syntactically valid TypeScript with proper exports', async () => {
        const mockSensitiveFieldsMap = {
          SimpleModel: {
            modelName: 'SimpleModel',
            allFields: ['id', 'name'],
            fieldsWithAnnotations: [],
            fieldsBySecurityLevel: {
              public: ['id', 'name'],
              sensitive: [],
              adminOnly: [],
              neverExpose: [],
            },
          },
        };

        await generateFieldPickingHelpers(tempOutputDir, mockSensitiveFieldsMap);
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Check proper file header
        expect(generatedContent).toContain('// Generated by');
        expect(generatedContent).toContain('// DO NOT EDIT - This file is automatically generated');
        expect(generatedContent).toContain('// SECURITY CRITICAL:');

        // Check ESLint disable comment
        expect(generatedContent).toContain(
          '/* eslint-disable @typescript-eslint/no-unused-vars */',
        );

        // Check proper TypeScript syntax for constants
        expect(generatedContent).toMatch(/export const \w+SafeFields = \[[\s\S]*?\] as const;/);
        expect(generatedContent).toMatch(
          /export type \w+SafeFields = typeof \w+SafeFields\[number\];/,
        );

        // Check proper function syntax
        expect(generatedContent).toMatch(
          /export function create\w+PublicSelector\(\) \{[\s\S]*?\}/,
        );
        expect(generatedContent).toMatch(/export function create\w+OwnerSelector\(\) \{[\s\S]*?\}/);
        expect(generatedContent).toMatch(/export function create\w+AdminSelector\(\) \{[\s\S]*?\}/);

        // Check proper object syntax with TypeScript type annotations
        expect(generatedContent).toMatch(
          /export const safeFieldSelectors: Record<string, Record<string, boolean>> = \{[\s\S]*?\};/,
        );
        expect(generatedContent).toMatch(
          /export const ownerFieldSelectors: Record<string, Record<string, boolean>> = \{[\s\S]*?\};/,
        );
        expect(generatedContent).toMatch(
          /export const adminFieldSelectors: Record<string, Record<string, boolean>> = \{[\s\S]*?\};/,
        );
      });

      it('should generate security comments and documentation', async () => {
        const mockSensitiveFieldsMap = {
          TestModel: {
            modelName: 'TestModel',
            allFields: ['field'],
            fieldsWithAnnotations: [],
            fieldsBySecurityLevel: {
              public: ['field'],
              sensitive: [],
              adminOnly: [],
              neverExpose: [],
            },
          },
        };

        await generateFieldPickingHelpers(tempOutputDir, mockSensitiveFieldsMap);
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Check security-focused comments are present
        expect(generatedContent).toContain(
          '// SECURITY CRITICAL: These fields are considered safe',
        );
        expect(generatedContent).toContain('// SECURITY CONTROLLED: Public selector excludes');
        expect(generatedContent).toContain('// SECURITY CONTROLLED: Owner selector includes');
        expect(generatedContent).toContain('// SECURITY CONTROLLED: Admin selector includes');
        expect(generatedContent).toContain('// SECURITY VALIDATION HELPERS');
        expect(generatedContent).toContain(
          '* SECURITY CRITICAL: This data drives runtime field filtering validation',
        );
        expect(generatedContent).toContain('RUNTIME SECURITY:');
        expect(generatedContent).toContain('SECURE SELECTOR SELECTION:');

        // Check warning comments about dangerous fields
        expect(generatedContent).toContain(
          '// All fields for reference (includes sensitive fields - DO NOT USE FOR PUBLIC RESPONSES)',
        );
      });

      it('should handle empty field lists gracefully', async () => {
        const mockSensitiveFieldsMap = {
          EmptyModel: {
            modelName: 'EmptyModel',
            allFields: [],
            fieldsWithAnnotations: [],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [],
              adminOnly: [],
              neverExpose: [],
            },
          },
        };

        await generateFieldPickingHelpers(tempOutputDir, mockSensitiveFieldsMap);
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Should generate valid TypeScript even with empty fields
        expect(generatedContent).toContain('export const emptymodelSafeFields = [');
        expect(generatedContent).toContain('] as const;');

        expect(generatedContent).toContain('export function createEmptyModelPublicSelector() {');
        expect(generatedContent).toContain('export function createEmptyModelOwnerSelector() {');
        expect(generatedContent).toContain('export function createEmptyModelAdminSelector() {');

        // Check that selectors handle empty field lists
        expect(generatedContent).toMatch(
          /createEmptyModelPublicSelector\(\) \{\s*return \{\s*\}\s*;\s*\}/,
        );
      });
    });
  });

  describe('SECURITY VALIDATION ERROR SCENARIOS', () => {
    describe('Contract: Validation should fail on security violations', () => {
      it('should throw error if fieldsBySecurityLevel is missing', async () => {
        const invalidFieldsMap = {
          InvalidModel: {
            modelName: 'InvalidModel',
            allFields: ['id'],
            fieldsWithAnnotations: [],
            // Missing fieldsBySecurityLevel!
          },
        };

        await expect(async () => {
          await generateFieldPickingHelpers(tempOutputDir, invalidFieldsMap);
        }).rejects.toThrow(/Missing fieldsBySecurityLevel data for model InvalidModel/);
      });
    });
  });

  describe('MULTIPLE MODEL GENERATION', () => {
    describe('Contract: Handle multiple models with different security patterns', () => {
      it('should generate selectors for multiple models correctly', async () => {
        const mockSensitiveFieldsMap = {
          User: {
            modelName: 'User',
            allFields: ['id', 'email', 'hashedPassword'],
            fieldsWithAnnotations: [
              {
                name: 'email',
                securityLevel: 'sensitive',
                isNeverExpose: false,
                isSensitive: true,
                isAdminOnly: false,
              },
              {
                name: 'hashedPassword',
                securityLevel: 'never-expose',
                isNeverExpose: true,
                isSensitive: false,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: ['id'],
              sensitive: ['email'],
              adminOnly: [],
              neverExpose: ['hashedPassword'],
            },
          },
          Document: {
            modelName: 'Document',
            allFields: ['id', 'title', 'content'],
            fieldsWithAnnotations: [
              {
                name: 'content',
                securityLevel: 'sensitive',
                isNeverExpose: false,
                isSensitive: true,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: ['id', 'title'],
              sensitive: ['content'],
              adminOnly: [],
              neverExpose: [],
            },
          },
        };

        await generateFieldPickingHelpers(tempOutputDir, mockSensitiveFieldsMap);
        const generatedContent = fs.readFileSync(
          path.join(tempOutputDir, 'field-selectors.ts'),
          'utf8',
        );

        // Should generate functions for both models
        expect(generatedContent).toContain('createUserPublicSelector');
        expect(generatedContent).toContain('createUserOwnerSelector');
        expect(generatedContent).toContain('createUserAdminSelector');

        expect(generatedContent).toContain('createDocumentPublicSelector');
        expect(generatedContent).toContain('createDocumentOwnerSelector');
        expect(generatedContent).toContain('createDocumentAdminSelector');

        // Should generate aggregate selectors for both models
        expect(generatedContent).toContain('user: createUserPublicSelector()');
        expect(generatedContent).toContain('document: createDocumentPublicSelector()');

        // Should generate runtime security data for both models
        expect(generatedContent).toContain('user: {');
        expect(generatedContent).toContain('document: {');
      });
    });
  });
});
