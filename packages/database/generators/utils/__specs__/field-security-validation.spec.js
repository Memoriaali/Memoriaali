/**
 * SECURITY VALIDATION TESTS
 * ========================
 *
 * Critical security tests to validate that field-picking helpers properly
 * exclude sensitive fields from public API responses.
 *
 * These tests MUST ALWAYS PASS to prevent data exposure vulnerabilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the actual generated field selectors for testing
const GENERATED_DIR = path.join(__dirname, '../../../generated/sensitive-fields');
const FIELD_SELECTORS_PATH = path.join(GENERATED_DIR, 'field-selectors.ts');
const SENSITIVE_FIELDS_PATH = path.join(GENERATED_DIR, 'sensitive-fields.ts');
const SECURITY_UTILS_PATH = path.join(GENERATED_DIR, 'security-utils.ts');

describe('Field Security Validation', () => {
  let fieldSelectorsContent;
  let sensitiveFieldsContent;
  let securityUtilsContent;

  beforeEach(() => {
    // Read the generated files for testing
    if (fs.existsSync(FIELD_SELECTORS_PATH)) {
      fieldSelectorsContent = fs.readFileSync(FIELD_SELECTORS_PATH, 'utf8');
    } else {
      throw new Error('field-selectors.ts not found - run generator first');
    }
    if (fs.existsSync(SENSITIVE_FIELDS_PATH)) {
      sensitiveFieldsContent = fs.readFileSync(SENSITIVE_FIELDS_PATH, 'utf8');
    } else {
      throw new Error('sensitive-fields.ts not found - run generator first');
    }
    if (fs.existsSync(SECURITY_UTILS_PATH)) {
      securityUtilsContent = fs.readFileSync(SECURITY_UTILS_PATH, 'utf8');
    }
  });

  describe('CRITICAL: Never-Expose Fields Security', () => {
    it('MUST never include @never-expose fields in ANY selector', () => {
      // Test the most critical case: RefreshToken.token field
      expect(fieldSelectorsContent).toContain('refreshtokenSafeFields');

      // Extract the safe fields array
      const safeFieldsMatch = fieldSelectorsContent.match(/refreshtokenSafeFields = \[(.*?)\]/s);
      expect(safeFieldsMatch).toBeTruthy();

      const safeFields = safeFieldsMatch[1];

      // CRITICAL: 'token' field must NOT be in safe fields
      expect(safeFields).not.toContain("'token'");
      expect(safeFields).not.toContain('"token"');
    });

    it('MUST never include @never-expose fields in public selectors', () => {
      const publicSelectorMatch = fieldSelectorsContent.match(
        /createRefreshTokenPublicSelector\(\) \{(.*?)\}/s,
      );
      expect(publicSelectorMatch).toBeTruthy();

      const publicSelector = publicSelectorMatch[1];

      // CRITICAL: 'token' field must NOT be in public selector
      expect(publicSelector).not.toContain('token: true');
    });

    it('MUST never include @never-expose fields in owner selectors', () => {
      const ownerSelectorMatch = fieldSelectorsContent.match(
        /createRefreshTokenOwnerSelector\(\) \{(.*?)\}/s,
      );
      expect(ownerSelectorMatch).toBeTruthy();

      const ownerSelector = ownerSelectorMatch[1];

      // CRITICAL: 'token' field must NOT be in owner selector
      expect(ownerSelector).not.toContain('token: true');
    });

    it('MUST never include @never-expose fields in admin selectors', () => {
      const adminSelectorMatch = fieldSelectorsContent.match(
        /createRefreshTokenAdminSelector\(\) \{(.*?)\}/s,
      );
      expect(adminSelectorMatch).toBeTruthy();

      const adminSelector = adminSelectorMatch[1];

      // CRITICAL: 'token' field must NOT be in admin selector
      expect(adminSelector).not.toContain('token: true');
    });

    it('MUST never include User password fields in ANY selector', () => {
      // Check all User selector functions
      const userSelectors = [
        'createUserPublicSelector',
        'createUserOwnerSelector',
        'createUserAdminSelector',
      ];

      for (const selectorName of userSelectors) {
        const selectorMatch = fieldSelectorsContent.match(
          new RegExp(`${selectorName}\\(\\) \\{(.*?)\\}`, 's'),
        );
        expect(selectorMatch).toBeTruthy();

        const selector = selectorMatch[1];

        // CRITICAL: Password-related fields must NEVER be exposed
        expect(selector).not.toContain('hashedPassword: true');
        expect(selector).not.toContain('salt: true');
        expect(selector).not.toContain('verificationCode: true');
      }
    });
  });

  describe('CRITICAL: Sensitive Fields Security', () => {
    it('MUST exclude @sensitive fields from public selectors', () => {
      // Test User model sensitive fields
      const userPublicMatch = fieldSelectorsContent.match(
        /createUserPublicSelector\(\) \{(.*?)\}/s,
      );
      expect(userPublicMatch).toBeTruthy();

      const publicSelector = userPublicMatch[1];

      // CRITICAL: Sensitive fields must NOT be in public selector
      const sensitiveFields = [
        'username',
        'hashedPassword',
        'salt',
        'verificationCode',
        'email',
        'firstName',
        'lastName',
        'streetAddress',
        'postalCode',
        'postOffice',
        'telephone',
        'profession',
        'companyName',
        'companyEmail',
        'companyTelephone',
        'companyContactPerson',
      ];

      for (const field of sensitiveFields) {
        expect(publicSelector).not.toContain(`${field}: true`);
      }
    });

    it('MUST include @sensitive fields in owner selectors', () => {
      const userOwnerMatch = fieldSelectorsContent.match(/createUserOwnerSelector\(\) \{(.*?)\}/s);
      expect(userOwnerMatch).toBeTruthy();

      const ownerSelector = userOwnerMatch[1];

      // Owner should have access to their own sensitive data (but not password hash)
      expect(ownerSelector).toContain('email: true');
      expect(ownerSelector).toContain('firstName: true');
      expect(ownerSelector).toContain('lastName: true');

      // CRITICAL SECURITY: Password hash must NEVER be exposed, even to owner
      // hashedPassword is marked as @never-expose, not @sensitive
      expect(ownerSelector).not.toContain('hashedPassword: true');
    });

    it('MUST exclude Document @sensitive fields from public selectors', () => {
      const docPublicMatch = fieldSelectorsContent.match(
        /createDocumentPublicSelector\(\) \{(.*?)\}/s,
      );
      expect(docPublicMatch).toBeTruthy();

      const publicSelector = docPublicMatch[1];

      // CRITICAL: Sensitive document fields must NOT be in public selector
      expect(publicSelector).not.toContain('originalFileName: true');
      expect(publicSelector).not.toContain('ocrText: true');
    });

    it('MUST include Document @sensitive fields in owner selectors', () => {
      const docOwnerMatch = fieldSelectorsContent.match(
        /createDocumentOwnerSelector\(\) \{(.*?)\}/s,
      );
      expect(docOwnerMatch).toBeTruthy();

      const ownerSelector = docOwnerMatch[1];

      // Owner should have access to their own document's sensitive data
      expect(ownerSelector).toContain('originalFileName: true');
      expect(ownerSelector).toContain('ocrText: true');
    });
  });

  describe('CRITICAL: Admin-Only Fields Security', () => {
    it('MUST exclude @admin-only fields from public selectors', () => {
      const userPublicMatch = fieldSelectorsContent.match(
        /createUserPublicSelector\(\) \{(.*?)\}/s,
      );
      expect(userPublicMatch).toBeTruthy();

      const publicSelector = userPublicMatch[1];

      // CRITICAL: Admin-only fields must NOT be in public selector
      expect(publicSelector).not.toContain('adminNotes: true');
    });

    it('MUST exclude @admin-only fields from owner selectors', () => {
      const userOwnerMatch = fieldSelectorsContent.match(/createUserOwnerSelector\(\) \{(.*?)\}/s);
      expect(userOwnerMatch).toBeTruthy();

      const ownerSelector = userOwnerMatch[1];

      // CRITICAL: Admin-only fields must NOT be in owner selector
      expect(ownerSelector).not.toContain('adminNotes: true');
    });

    it('MUST include @admin-only fields in admin selectors', () => {
      const userAdminMatch = fieldSelectorsContent.match(/createUserAdminSelector\(\) \{(.*?)\}/s);
      expect(userAdminMatch).toBeTruthy();

      const adminSelector = userAdminMatch[1];

      // Admin should have access to admin-only fields
      expect(adminSelector).toContain('adminNotes: true');
    });
  });

  describe('Security Helper Functions', () => {
    it('MUST include getSecureFieldSelector function', () => {
      expect(fieldSelectorsContent).toContain('getSecureFieldSelector');
      expect(fieldSelectorsContent).toContain('function getSecureFieldSelector');
    });

    it('MUST include validateFieldSelector function', () => {
      expect(fieldSelectorsContent).toContain('validateFieldSelector');
      expect(fieldSelectorsContent).toContain('function validateFieldSelector');
    });

    it('MUST export all three selector types', () => {
      expect(fieldSelectorsContent).toContain('export const safeFieldSelectors');
      expect(fieldSelectorsContent).toContain('export const ownerFieldSelectors');
      expect(fieldSelectorsContent).toContain('export const adminFieldSelectors');
    });

    it('MUST have proper security level checking functions', () => {
      if (securityUtilsContent) {
        // Check for essential security functions
        expect(securityUtilsContent).toContain('hasSecurityLevel');
        expect(securityUtilsContent).toContain('isSensitiveField');
        expect(securityUtilsContent).toContain('isNeverExposeField');
        expect(securityUtilsContent).toContain('isAdminOnlyField');

        // Check for security level type definitions
        expect(securityUtilsContent).toContain('SecurityLevel');
        expect(securityUtilsContent).toContain('UserRole');
      }
    });
  });

  describe('Generated File Security Headers', () => {
    it('MUST include security warnings in generated files', () => {
      expect(fieldSelectorsContent).toContain('SECURITY CRITICAL');
      expect(fieldSelectorsContent).toContain('DO NOT EDIT - This file is automatically generated');
    });

    it('MUST include security comments for each selector type', () => {
      expect(fieldSelectorsContent).toContain('SECURITY CONTROLLED: Public selector excludes');
      expect(fieldSelectorsContent).toContain('SECURITY CONTROLLED: Owner selector includes');
      expect(fieldSelectorsContent).toContain('SECURITY CONTROLLED: Admin selector includes');
    });
  });

  describe('Regression Prevention', () => {
    it('MUST maintain security level assignments in sensitive fields metadata', () => {
      expect(sensitiveFieldsContent).toContain('"securityLevel": "never-expose"');
      expect(sensitiveFieldsContent).toContain('"securityLevel": "sensitive"');
      expect(sensitiveFieldsContent).toContain('"securityLevel": "admin-only"');
    });

    it('MUST properly categorize RefreshToken fields', () => {
      // Verify token is marked as never-expose
      const refreshTokenSection =
        sensitiveFieldsContent.match(
          /RefreshToken field annotations(.*?)MetadataSuggestion field annotations/s,
        ) || sensitiveFieldsContent.match(/RefreshToken field annotations(.*?)$/s);

      if (refreshTokenSection) {
        expect(refreshTokenSection[1]).toContain("RefreshTokenNeverExposeFields = 'token'");
      }
    });

    it('MUST properly categorize User sensitive fields', () => {
      // Verify User sensitive fields are properly categorized
      expect(sensitiveFieldsContent).toContain('UserSensitiveFields');
      expect(sensitiveFieldsContent).toContain('UserNeverExposeFields');
      expect(sensitiveFieldsContent).toContain('UserAdminOnlyFields');

      // Check that hashedPassword is in never-expose
      const userNeverExposeMatch = sensitiveFieldsContent.match(
        /userNeverExposeFields: UserNeverExposeFields\[\] = \[(.*?)\]/s,
      );
      expect(userNeverExposeMatch).toBeTruthy();
      expect(userNeverExposeMatch[1]).toContain('hashedPassword');
      expect(userNeverExposeMatch[1]).toContain('salt');
      expect(userNeverExposeMatch[1]).toContain('verificationCode');
    });
  });

  describe('End-to-End Security Validation', () => {
    it('MUST ensure complete field isolation between roles', () => {
      // Public fields should be a strict subset of owner fields
      const userPublicMatch = fieldSelectorsContent.match(
        /createUserPublicSelector\(\) \{(.*?)\}/s,
      );
      const userOwnerMatch = fieldSelectorsContent.match(/createUserOwnerSelector\(\) \{(.*?)\}/s);

      expect(userPublicMatch).toBeTruthy();
      expect(userOwnerMatch).toBeTruthy();

      const publicFields = userPublicMatch[1].match(/(\w+): true/g) || [];
      const ownerFields = userOwnerMatch[1].match(/(\w+): true/g) || [];

      // Public fields should be fewer than owner fields
      expect(publicFields.length).toBeLessThan(ownerFields.length);

      // Every public field should exist in owner fields
      for (const publicField of publicFields) {
        expect(ownerFields).toContain(publicField);
      }
    });

    it('MUST validate field counts match expected security model', () => {
      // Extract User safe fields
      const userSafeMatch = fieldSelectorsContent.match(/userSafeFields = \[(.*?)\] as const/s);
      expect(userSafeMatch).toBeTruthy();

      const safeFieldsList = userSafeMatch[1].split(',').filter((f) => f.trim());

      // Should have a reasonable number of safe fields
      expect(safeFieldsList.length).toBeGreaterThan(10); // Basic fields
      expect(safeFieldsList.length).toBeLessThan(50); // Not everything

      // Should NOT contain any sensitive field names
      const safeFieldsString = userSafeMatch[1];
      expect(safeFieldsString).not.toContain('password');
      expect(safeFieldsString).not.toContain('salt');
      expect(safeFieldsString).not.toContain('token');
      expect(safeFieldsString).not.toContain('verificationCode');
    });

    it('MUST have consistent field categorization across all files', () => {
      // Check that RefreshToken.token is consistently marked as never-expose
      expect(sensitiveFieldsContent).toContain("RefreshTokenNeverExposeFields = 'token'");
      expect(fieldSelectorsContent).not.toContain('token: true');

      // Check that User.hashedPassword is consistently marked as never-expose
      expect(sensitiveFieldsContent).toContain('hashedPassword');
      expect(sensitiveFieldsContent).toContain('UserNeverExposeFields');

      // Verify no selector includes hashedPassword
      const allSelectors = fieldSelectorsContent.match(/create\w+Selector\(\) \{(.*?)\}/gs) || [];
      for (const selector of allSelectors) {
        expect(selector).not.toContain('hashedPassword: true');
      }
    });
  });
});
