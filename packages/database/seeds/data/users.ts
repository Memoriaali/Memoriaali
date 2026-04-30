/**
 * User model seeding
 */

import { PasswordService } from '@memoriaali/shared';
import { AccountType, PrismaClient, UserRole } from '../../generated/client';
import { getEnvironment, isProduction } from '../utils/environment';
import { upsertWithLog } from '../utils/helpers';
import { logger } from '../utils/logger';

// Initialize PasswordService for consistent password hashing
const passwordService = new PasswordService();

/**
 * Helper function to create hashed password data
 */
const createPasswordData = async (plainPassword: string) => {
  return await passwordService.createPasswordHash(plainPassword);
};

export const seedUsers = async (prisma: PrismaClient): Promise<void> => {
  logger.start('Users');

  const env = getEnvironment();

  // Always create essential system users
  await seedEssentialUsers(prisma);

  // Environment-specific users
  switch (env) {
    case 'development':
      await seedDevelopmentUsers(prisma);
      break;
    case 'staging':
      await seedStagingUsers(prisma);
      break;
    case 'e2e':
      await seedE2EUsers(prisma);
      break;
    default:
      logger.warning('Unsupported environment, skipping users seeding:', env);
      break;
  }

  const userCount = await prisma.user.count();
  logger.complete('Users', userCount);
};

/**
 * Essential system users for all environments
 */
const seedEssentialUsers = async (prisma: PrismaClient): Promise<void> => {
  // System administrator
  const adminPasswordData = await createPasswordData('Admin111');

  await upsertWithLog(
    () =>
      prisma.user.upsert({
        where: { email: 'admin@memoriaali.fi' },
        update: {
          id: '1357a5a7-c683-465c-a2c3-9758f3585a12',
          firstName: 'System',
          lastName: 'Administrator',
          hashedPassword: adminPasswordData.hashedPassword,
          salt: adminPasswordData.salt,
          role: UserRole.ADMIN,
          isActivated: true,
        },
        create: {
          id: '1357a5a7-c683-465c-a2c3-9758f3585a12',
          email: 'admin@memoriaali.fi',
          username: 'admin',
          firstName: 'System',
          lastName: 'Administrator',
          role: UserRole.ADMIN,
          isActivated: true,
          hashedPassword: adminPasswordData.hashedPassword,
          salt: adminPasswordData.salt,
          accountType: AccountType.PRIVATE,
          verificationCode: `${Math.floor(Math.random() * 900000) + 100000}`,
        },
      }),
    'User',
    'admin@memoriaali.fi',
  );

  // Service account (if needed for integrations)
  if (!isProduction()) {
    const servicePasswordData = await createPasswordData('service');

    await upsertWithLog(
      () =>
        prisma.user.upsert({
          where: { email: 'service@memoriaali.fi' },
          update: {
            id: '7e973947-e9c5-4990-a70f-d00f8c1a2c46',
            firstName: 'Service',
            lastName: 'Account',
            role: UserRole.ADMIN,
            hashedPassword: servicePasswordData.hashedPassword,
            salt: servicePasswordData.salt,
            isActivated: true,
          },
          create: {
            id: '7e973947-e9c5-4990-a70f-d00f8c1a2c46',
            email: 'service@memoriaali.fi',
            username: 'service',
            firstName: 'Service',
            lastName: 'Account',
            role: UserRole.ADMIN,
            isActivated: true,
            hashedPassword: servicePasswordData.hashedPassword,
            salt: servicePasswordData.salt,
            accountType: AccountType.PRIVATE,
            verificationCode: `${Math.floor(Math.random() * 900000) + 100000}`,
          },
        }),
      'User',
      'service@memoriaali.fi',
    );
  }
};

/**
 * Development environment test users
 */
const seedDevelopmentUsers = async (prisma: PrismaClient): Promise<void> => {
  // Create an array of test users with different roles
  const testUsers = [
    {
      email: 'moderator@example.com',
      username: 'moderator',
      firstName: 'Test',
      lastName: 'Moderator',
      role: UserRole.MODERATOR,
      password: 'Moderator123!',
    },
    {
      email: 'expert@example.com',
      username: 'expert',
      firstName: 'Test',
      lastName: 'Expert',
      role: UserRole.EXPERT,
      password: 'Expert123!',
    },
    {
      email: 'user@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
      password: 'User123!',
    },
    {
      email: 'unactivated@example.com',
      username: 'unactivated',
      firstName: 'Unactivated',
      lastName: 'User',
      role: UserRole.USER,
      password: 'Unactivated123!',
      isActivated: false,
    },
  ];

  for (const userData of testUsers) {
    const passwordData = await createPasswordData(userData.password);

    await upsertWithLog(
      () =>
        prisma.user.upsert({
          where: { email: userData.email },
          update: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            isActivated: userData.isActivated !== false,
            hashedPassword: passwordData.hashedPassword,
            salt: passwordData.salt,
          },
          create: {
            email: userData.email,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            isActivated: userData.isActivated !== false,
            hashedPassword: passwordData.hashedPassword,
            salt: passwordData.salt,
            accountType: AccountType.PRIVATE,
            verificationCode: `${Math.floor(Math.random() * 900000) + 100000}`,
          },
        }),
      'User',
      userData.email,
    );
  }

  // Create some company users
  const companyUsers = [
    {
      email: 'company.admin@example.com',
      username: 'companyadmin',
      firstName: 'Company',
      lastName: 'Admin',
      role: UserRole.USER,
      companyName: 'Test Company Ltd',
      companyEmail: 'info@testcompany.com',
      password: 'Company123!',
    },
  ];

  for (const userData of companyUsers) {
    const passwordData = await createPasswordData(userData.password);

    await upsertWithLog(
      () =>
        prisma.user.upsert({
          where: { email: userData.email },
          update: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            companyName: userData.companyName,
            companyEmail: userData.companyEmail,
          },
          create: {
            email: userData.email,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            isActivated: true,
            hashedPassword: passwordData.hashedPassword,
            salt: passwordData.salt,
            accountType: AccountType.COMPANY,
            companyName: userData.companyName,
            companyEmail: userData.companyEmail,
            verificationCode: `${Math.floor(Math.random() * 900000) + 100000}`,
          },
        }),
      'User',
      userData.email,
    );
  }
};

/**
 * Staging environment test users
 */
const seedStagingUsers = async (prisma: PrismaClient): Promise<void> => {
  // Minimal test users for staging
  const stagingUsers = [
    {
      email: 'test.admin@memoriaali.fi',
      username: 'testadmin',
      firstName: 'Test',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      password: 'Testadmin123!',
    },
    {
      email: 'test.user@memoriaali.fi',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
      password: 'Testuser123!',
    },
  ];

  for (const userData of stagingUsers) {
    const passwordData = await createPasswordData(userData.password);

    await upsertWithLog(
      () =>
        prisma.user.upsert({
          where: { email: userData.email },
          update: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            hashedPassword: passwordData.hashedPassword,
            salt: passwordData.salt,
          },
          create: {
            email: userData.email,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            isActivated: true,
            hashedPassword: passwordData.hashedPassword,
            salt: passwordData.salt,
            accountType: AccountType.PRIVATE,
            verificationCode: `${Math.floor(Math.random() * 900000) + 100000}`,
          },
        }),
      'User',
      userData.email,
    );
  }
};

/**
 * E2E testing environment users
 */
const seedE2EUsers = async (prisma: PrismaClient): Promise<void> => {
  // E2E test users with predictable passwords
  const e2eUsers = [
    {
      id: 'e2e-admin-user-id',
      email: 'admin@e2e.test',
      username: 'e2eadmin',
      firstName: 'E2E',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      password: 'AdminBackendE2E123!',
    },
    {
      id: 'e2e-normal-user-id',
      email: 'user@e2e.test',
      username: 'e2euser',
      firstName: 'E2E',
      lastName: 'User',
      role: UserRole.USER,
      password: 'UserBackendE2E123!',
    },
    {
      id: 'e2e-inactive-user-id',
      email: 'inactive@e2e.test',
      username: 'e2einactive',
      firstName: 'E2E',
      lastName: 'Inactive',
      role: UserRole.USER,
      password: 'InactiveBackendE2E123!',
      isActivated: false,
    },
  ];

  for (const userData of e2eUsers) {
    const passwordData = await createPasswordData(userData.password);

    await upsertWithLog(
      () =>
        prisma.user.upsert({
          where: { email: userData.email },
          update: {
            id: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            isActivated: userData.isActivated !== false,
          },
          create: {
            id: userData.id,
            email: userData.email,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            isActivated: userData.isActivated !== false,
            hashedPassword: passwordData.hashedPassword,
            salt: passwordData.salt,
            accountType: AccountType.PRIVATE,
            verificationCode: `${Math.floor(Math.random() * 900000) + 100000}`,
          },
        }),
      'User',
      userData.email,
    );
  }
};
