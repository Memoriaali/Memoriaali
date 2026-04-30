/**
 * Shared Prisma Client Mock for backend unit tests
 *
 * Provides a reusable, typed mock for Prisma models used across services.
 * Extend model sections as new services require them.
 */

import { type PrismaClient } from '@memoriaali/database';
import { vi, type MockedFunction } from 'vitest';

// Narrow, typed helpers for common Prisma model methods we use in tests
type FindUniqueFn<Args, Result> = MockedFunction<(args: Args) => Promise<Result | null>>;
type FindFirstFn<Args, Result> = MockedFunction<(args: Args) => Promise<Result | null>>;
type FindManyFn<Args, Result> = MockedFunction<(args: Args) => Promise<Result[]>>;
type CreateFn<Args, Result> = MockedFunction<(args: Args) => Promise<Result>>;
type UpdateFn<Args, Result> = MockedFunction<(args: Args) => Promise<Result>>;
type DeleteFn<Args, Result> = MockedFunction<(args: Args) => Promise<Result>>;
type CountFn<Args> = MockedFunction<(args?: Args) => Promise<number>>;

/**
 * Factory creating a Prisma-like mock object with only the models/methods
 * our unit tests currently need. Cast to PrismaClient when passing to services.
 */
export const createSharedPrismaMock = () => {
  // Document model mocks
  const document = {
    create: vi.fn() as CreateFn<any, any>,
    findUnique: vi.fn() as FindUniqueFn<any, any>,
    update: vi.fn() as UpdateFn<any, any>,
    delete: vi.fn() as DeleteFn<any, any>,
    count: vi.fn() as CountFn<any>,
    findMany: vi.fn() as FindManyFn<any, any>,
  };

  // Comment model mocks
  const comment = {
    create: vi.fn() as CreateFn<any, any>,
    findUnique: vi.fn() as FindUniqueFn<any, any>,
    update: vi.fn() as UpdateFn<any, any>,
    delete: vi.fn() as DeleteFn<any, any>,
    count: vi.fn() as CountFn<any>,
    findMany: vi.fn() as FindManyFn<any, any>,
  };

  // ResearchRequest model mocks
  const researchRequest = {
    create: vi.fn() as CreateFn<any, any>,
    findUnique: vi.fn() as FindUniqueFn<any, any>,
    findFirst: vi.fn() as FindFirstFn<any, any>,
    findMany: vi.fn() as FindManyFn<any, any>,
    count: vi.fn() as CountFn<any>,
    update: vi.fn() as UpdateFn<any, any>,
    delete: vi.fn() as DeleteFn<any, any>,
  };

  // DocumentsInCollections and related models
  const documentsInCollections = {
    findUnique: vi.fn() as FindUniqueFn<any, any>,
    create: vi.fn() as CreateFn<any, any>,
    delete: vi.fn() as DeleteFn<any, any>,
  };
  const collection = {
    findUnique: vi.fn() as FindUniqueFn<any, any>,
  };
  const usersInGroups = {
    findUnique: vi.fn() as FindUniqueFn<any, any>,
    findMany: vi.fn() as FindManyFn<any, any>,
  };
  const user = {
    findUnique: vi.fn() as FindUniqueFn<any, any>,
  };
  const refreshToken = {
    findFirst: vi.fn() as FindFirstFn<any, any>,
    create: vi.fn() as CreateFn<any, any>,
    update: vi.fn() as UpdateFn<any, any>,
    deleteMany: vi.fn() as MockedFunction<(args?: any) => Promise<any>>, // limited usage in tests
  };

  // Group model mocks
  const group = {
    findFirst: vi.fn() as FindFirstFn<any, any>,
    findUnique: vi.fn() as FindUniqueFn<any, any>,
    findMany: vi.fn() as FindManyFn<any, any>,
    count: vi.fn() as CountFn<any>,
    create: vi.fn() as CreateFn<any, any>,
    update: vi.fn() as UpdateFn<any, any>,
    delete: vi.fn() as DeleteFn<any, any>,
  };

  // Expose minimal client-like shape
  const prismaMock = {
    document,
    comment,
    researchRequest,
    documentsInCollections,
    collection,
    usersInGroups,
    user,
    refreshToken,
    group,
    $transaction: vi.fn(),
  } as unknown as PrismaClient;

  const resetAll = (): void => {
    vi.clearAllMocks();
  };

  return {
    prismaMock,
    document,
    comment,
    group,
    resetAll,
  };
};
