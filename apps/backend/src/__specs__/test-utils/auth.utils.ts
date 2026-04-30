import { UserRole } from '@memoriaali/database';

import { createUser } from './user.utils';

import { prisma } from '../../shared/database/prisma';
import { generateJwtToken } from '../../shared/utils/jwt.utils';

/**
 * Authentication utilities for testing
 */

/**
 * Create a test user and return both the user and JWT token
 */
export const createAuthenticatedUser = async (role: UserRole = UserRole.ADMIN) => {
  const user = await createUser(role);

  const token = generateJwtToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, token };
};

/**
 * Generate JWT token for existing user
 */
export const generateTokenForUser = (userId: string, email: string, role: string) => {
  return generateJwtToken({
    userId,
    email,
    role,
  });
};

/**
 * Create admin user for tests that require admin permissions
 */
export const createAdminUser = async () => {
  return createAuthenticatedUser(UserRole.ADMIN);
};

/**
 * Create regular user for general tests
 */
export const createTestUser = async () => {
  return createAuthenticatedUser(UserRole.USER);
};

/**
 * Cleanup test users and related data
 */
export const cleanupTestUsers = async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test-',
      },
    },
  });
};
