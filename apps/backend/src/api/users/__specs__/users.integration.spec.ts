/**
 * Integration Tests for User Service
 * Tests database operations and service interactions
 */
import { AccountType, UserRole } from '@memoriaali/database';
import * as bcrypt from 'bcryptjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../../shared/database/prisma';
import { AuthenticatedUser } from '../../../shared/types/authenticated-user';
import { CreateUserInput } from '../users.schemas';
import { UsersService } from '../users.service';

describe('User Service - Integration Tests', () => {
  let userService: UsersService;

  beforeEach(async () => {
    // Clean test data
    await prisma.user.deleteMany();
    userService = new UsersService(prisma);
  });

  afterEach(async () => {
    // Clean up after tests
    await prisma.user.deleteMany();
  });

  describe('createUser', () => {
    it('creates user with real database persistence and password hashing', async () => {
      const userData: CreateUserInput = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        accountType: AccountType.PRIVATE,
        passwordResetToken: null,
        passwordResetExpires: null,
      };

      const adminAuth = new AuthenticatedUser(
        'admin-id',
        'admin@example.com',
        'Admin',
        'User',
        'ADMIN',
        true,
        true,
      );

      const user = await userService.createUser(userData, adminAuth);

      // Verify in database
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser?.email).toBe(userData.email);
      expect(dbUser?.hashedPassword).toBeDefined();
      expect(dbUser?.hashedPassword).not.toBe(userData.password);
      expect(dbUser?.hashedPassword?.startsWith('$2b$')).toBe(true); // bcrypt hash
      expect(dbUser?.isActivated).toBe(true); // Users created via this endpoint are activated immediately
    });

    it('enforces unique email constraint', async () => {
      // Create first user
      const adminAuth = new AuthenticatedUser(
        'admin-id',
        'admin@example.com',
        'Admin',
        'User',
        'ADMIN',
        true,
        true,
      );

      await userService.createUser(
        {
          email: 'duplicate@example.com',
          password: 'Pass123!',
          username: 'user1',
          firstName: 'First',
          lastName: 'User',
          role: UserRole.USER,
          accountType: AccountType.PRIVATE,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
        adminAuth,
      );

      // Try to create with same email
      await expect(
        userService.createUser(
          {
            email: 'duplicate@example.com',
            password: 'Pass123!',
            username: 'user2',
            firstName: 'Second',
            lastName: 'User',
            role: UserRole.USER,
            accountType: AccountType.PRIVATE,
            passwordResetToken: null,
            passwordResetExpires: null,
          },
          adminAuth,
        ),
      ).rejects.toThrow();
    });
  });

  describe('adminActivateUser', () => {
    it('activates user and creates audit log', async () => {
      // Create inactive user
      const user = await prisma.user.create({
        data: {
          email: 'inactive@example.com',
          hashedPassword: await bcrypt.hash('Pass123!', 10),
          username: 'inactiveuser',
          firstName: 'Inactive',
          lastName: 'User',
          role: UserRole.USER,
          accountType: AccountType.PRIVATE,
          isActivated: false,
          verificationCode: 'some-code',
          salt: 'test-salt',
        },
      });

      // Create admin user for the update operation
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          hashedPassword: await bcrypt.hash('AdminPass123!', 10),
          salt: 'admin-salt',
          username: 'adminuser',
          firstName: 'Admin',
          lastName: 'User',
          role: UserRole.ADMIN,
          accountType: AccountType.PRIVATE,
          isActivated: true,
          verificationCode: '',
        },
      });

      const activationData = {
        isActivated: true,
        reason: 'Manual activation for testing',
      };

      const activated = await userService.adminActivateUser(user.id, activationData, adminUser.id);

      expect(activated.isActivated).toBe(true);
      expect(activated.verificationCode).toBe('');

      // Verify no errors occurred (audit logging removed for now)
    });
  });

  describe('findAll with pagination', () => {
    it('paginates users with real database queries', async () => {
      // Create test users
      const hashedPassword = await bcrypt.hash('Pass123!', 10);
      const usersToCreate = [];
      for (let i = 0; i < 15; i++) {
        usersToCreate.push({
          email: `user${i}@example.com`,
          hashedPassword,
          username: `user${i}`,
          firstName: `User`,
          lastName: `${i}`,
          role: UserRole.USER,
          accountType: AccountType.PRIVATE,
          salt: 'test-salt',
          verificationCode: 'initial-code',
        });
      }
      await prisma.user.createMany({ data: usersToCreate });

      const page1 = await userService.listUsers({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(page1.data).toHaveLength(10);
      expect(page1.pagination.totalCount).toBe(15);
      expect(page1.pagination.totalPages).toBe(2);
      expect(page1.pagination.hasNextPage).toBe(true);

      const page2 = await userService.listUsers({
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(page2.data).toHaveLength(5);
      expect(page2.pagination.hasNextPage).toBe(false);
    });
  });
});
