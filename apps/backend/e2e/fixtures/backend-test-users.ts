/**
 * Backend E2E Test User Fixtures
 *
 * This file contains test user data specifically designed for backend API E2E testing.
 * All users have properly hashed passwords and realistic data for testing various scenarios.
 */

import type { User } from '@memoriaali/database/generated/client';
import { AccountType, UserRole } from '@memoriaali/database/generated/client';

/**
 * Test user credentials for authentication
 * These plain text passwords are used for login testing
 */
export const testCredentials = {
  admin: {
    email: 'admin@backend.e2e.memoriaali.test',
    password: 'AdminBackendE2E123!',
  },
  regularUser: {
    email: 'user@backend.e2e.memoriaali.test',
    password: 'UserBackendE2E123!',
  },
  inactiveUser: {
    email: 'inactive@backend.e2e.memoriaali.test',
    password: 'InactiveBackendE2E123!',
  },
} as const;

/**
 * Backend E2E Test user fixtures
 * Note: These users will be seeded into the test database
 */
export const backendE2ETestUsers = {
  admin: {
    id: 'backend-e2e-admin-001',
    username: 'admin.backend.e2e',
    email: testCredentials.admin.email,
    firstName: 'Admin',
    lastName: 'E2E',
    role: UserRole.ADMIN,
    accountType: AccountType.PRIVATE,
    isActivated: true,
    verificationCode: '',
    streetAddress: '123 Admin Street',
    postalCode: '00100',
    postOffice: 'Helsinki',
    telephone: '+358401234567',
    profession: 'System Administrator',
    companyName: null,
    companyEmail: null,
    companyTelephone: null,
    companyContactPerson: null,
    // Note: hashedPassword and salt will be generated during seeding
    hashedPassword: '', // Will be set during seeding
    salt: '', // Will be set during seeding
    adminNotes: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    createdById: null,
    updatedById: null,
  } satisfies Omit<User, 'hashedPassword' | 'salt'> & { hashedPassword: string; salt: string },

  regularUser: {
    id: 'backend-e2e-user-001',
    username: 'user.backend.e2e',
    email: testCredentials.regularUser.email,
    firstName: 'Regular',
    lastName: 'User',
    role: UserRole.USER,
    accountType: AccountType.PRIVATE,
    isActivated: true,
    verificationCode: '',
    streetAddress: '456 User Avenue',
    postalCode: '00200',
    postOffice: 'Espoo',
    telephone: '+358407654321',
    profession: 'Software Developer',
    companyName: null,
    companyEmail: null,
    companyTelephone: null,
    companyContactPerson: null,
    hashedPassword: '', // Will be set during seeding
    salt: '', // Will be set during seeding
    adminNotes: null,
    createdAt: new Date('2024-01-02T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    createdById: 'backend-e2e-admin-001',
    updatedById: null,
  } satisfies Omit<User, 'hashedPassword' | 'salt'> & { hashedPassword: string; salt: string },

  inactiveUser: {
    id: 'backend-e2e-inactive-001',
    username: 'inactive.backend.e2e',
    email: testCredentials.inactiveUser.email,
    firstName: 'Inactive',
    lastName: 'Pending',
    role: UserRole.USER,
    accountType: AccountType.PRIVATE,
    isActivated: false,
    verificationCode: 'BACKEND_E2E_VERIFICATION_123',
    streetAddress: '789 Pending Road',
    postalCode: '00300',
    postOffice: 'Vantaa',
    telephone: '+358409876543',
    profession: 'Designer',
    companyName: null,
    companyEmail: null,
    companyTelephone: null,
    companyContactPerson: null,
    hashedPassword: '', // Will be set during seeding
    salt: '', // Will be set during seeding
    adminNotes: null,
    createdAt: new Date('2024-01-03T00:00:00Z'),
    updatedAt: new Date('2024-01-03T00:00:00Z'),
    createdById: 'backend-e2e-admin-001',
    updatedById: null,
  } satisfies Omit<User, 'hashedPassword' | 'salt'> & { hashedPassword: string; salt: string },

  companyUser: {
    id: 'backend-e2e-company-001',
    username: 'company.backend.e2e',
    email: 'company@backend.e2e.memoriaali.test',
    firstName: 'Company',
    lastName: 'Representative',
    role: UserRole.USER,
    accountType: AccountType.COMPANY,
    isActivated: true,
    verificationCode: '',
    streetAddress: '321 Business Street',
    postalCode: '00400',
    postOffice: 'Tampere',
    telephone: '+358405555555',
    profession: 'Project Manager',
    companyName: 'E2E Test Company Oy',
    companyEmail: 'info@e2etestcompany.fi',
    companyTelephone: '+358406666666',
    companyContactPerson: 'Company Contact',
    hashedPassword: '', // Will be set during seeding
    salt: '', // Will be set during seeding
    adminNotes: null,
    createdAt: new Date('2024-01-04T00:00:00Z'),
    updatedAt: new Date('2024-01-04T00:00:00Z'),
    createdById: 'backend-e2e-admin-001',
    updatedById: null,
  } satisfies Omit<User, 'hashedPassword' | 'salt'> & { hashedPassword: string; salt: string },
} as const;

/**
 * Generate bulk users for pagination testing
 * Creates multiple users with incrementing data for testing large datasets
 */
export function generateBackendBulkUsers(
  count: number = 50,
): Array<Omit<User, 'hashedPassword' | 'salt'> & { hashedPassword: string; salt: string }> {
  const bulkUsers: Array<
    Omit<User, 'hashedPassword' | 'salt'> & { hashedPassword: string; salt: string }
  > = [];

  for (let i = 1; i <= count; i++) {
    const paddedNumber = i.toString().padStart(3, '0');
    bulkUsers.push({
      id: `backend-e2e-bulk-${paddedNumber}`,
      username: `bulk${paddedNumber}.backend.e2e`,
      email: `bulk${paddedNumber}@backend.e2e.memoriaali.test`,
      firstName: `Bulk${paddedNumber}`,
      lastName: `User`,
      role: i % 10 === 0 ? UserRole.ADMIN : UserRole.USER, // Every 10th user is admin
      accountType: i % 3 === 0 ? AccountType.COMPANY : AccountType.PRIVATE, // Every 3rd user is company
      isActivated: i % 5 !== 0, // Every 5th user is inactive
      verificationCode: i % 5 === 0 ? `VER_${paddedNumber}` : '',
      streetAddress: `${100 + i} Bulk Street`,
      postalCode: `${10000 + i}`,
      postOffice: i % 3 === 0 ? 'Helsinki' : i % 3 === 1 ? 'Espoo' : 'Vantaa',
      telephone: `+35840${1000000 + i}`,
      profession: `Bulk Profession ${i}`,
      companyName: i % 3 === 0 ? `Bulk Company ${i} Oy` : null,
      companyEmail: i % 3 === 0 ? `bulk${paddedNumber}@company.test` : null,
      companyTelephone: i % 3 === 0 ? `+35840${2000000 + i}` : null,
      companyContactPerson: i % 3 === 0 ? `Contact Person ${i}` : null,
      hashedPassword: '', // Will be set during seeding
      salt: '', // Will be set during seeding
      adminNotes: null,
      createdAt: new Date(`2024-01-${5 + (i % 25)}T${i % 24}:00:00Z`),
      updatedAt: new Date(`2024-01-${5 + (i % 25)}T${i % 24}:00:00Z`),
      createdById: 'backend-e2e-admin-001',
      updatedById: null,
    });
  }

  return bulkUsers;
}

/**
 * All test users combined for easy access
 */
export const allTestUsers = {
  ...backendE2ETestUsers,
  bulk: generateBackendBulkUsers(50),
} as const;

/**
 * Helper to get user by email for testing
 */
export function getTestUserByEmail(email: string) {
  const allUsers = Object.values(backendE2ETestUsers);
  return allUsers.find((user) => user.email === email);
}

/**
 * Helper to get test credentials by email
 */
export function getTestCredentialsByEmail(email: string) {
  const credEntry = Object.entries(testCredentials).find(([, cred]) => cred.email === email);
  return credEntry ? credEntry[1] : null;
}
