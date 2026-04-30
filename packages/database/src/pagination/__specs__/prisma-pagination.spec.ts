/**
 * Comprehensive Test Suite for Prisma Pagination Service
 *
 * Exemplary test suite demonstrating best practices for:
 * - Type-safe test utilities and factories
 * - Performance-optimized test patterns
 * - Comprehensive edge case coverage
 * - Reusable assertion helpers
 * - Modular test organization
 *
 * Modern, maintainable test suite following TDD principles with:
 * - Parameterized tests for comprehensive coverage
 * - Test fixtures and helpers for DRY principles
 * - Behavior-driven descriptions
 * - Performance benchmarking
 * - Edge case and error scenario coverage
 */

import type { PaginationLinks, PaginationResponse } from '@memoriaali/shared';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTestData, createTestUser, testDb } from '../../__tests__/test-setup';
import { PrismaPaginationService } from '../prisma-pagination.service';

// ============================================================================
// Type Definitions & Interfaces
// ============================================================================

type TestUserRole = 'ADMIN' | 'USER' | 'MODERATOR';

interface TestUser {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly role: TestUserRole;
  readonly isActivated: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface PaginationTestFixture<T = TestUser> {
  readonly service: PrismaPaginationService;
  readonly baseUrl: string;
  readonly testData: ReadonlyArray<T>;
}

interface CursorTestCase {
  readonly name: string;
  readonly limit: number;
  readonly expectedPages: number;
  readonly totalItems: number;
}

interface ErrorTestCase {
  readonly name: string;
  readonly options: any;
  readonly expectedError: string | RegExp;
}

interface RoleFilterCase {
  readonly role: TestUserRole;
  readonly expectedCount: number;
}

interface OffsetTestCase {
  readonly totalItems: number;
  readonly limit: number;
  readonly page: number;
  readonly expectedLength: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

interface PaginationValidationOptions {
  readonly length: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
  readonly totalCount?: number;
  readonly errorMessage?: string;
}

interface PerformanceMetrics {
  readonly result: any;
  readonly executionTime: number;
  readonly operationName: string;
}

// ============================================================================
// Test Data Factories & Builders
// ============================================================================

/**
 * Builder pattern for flexible test data creation with performance optimizations
 */
class TestDataFactory {
  private static readonly BASE_TIMESTAMP = Date.now();
  private static readonly TIMESTAMP_INCREMENT = 1000; // 1 second increments

  private _count: number = 10;
  private _roleDistribution?: Partial<Record<TestUserRole, number>>;
  private _isActivated: boolean = true;
  private _namePattern?: string;
  private _nextTimestamp: number = TestDataFactory.BASE_TIMESTAMP;

  static create(): TestDataFactory {
    return new TestDataFactory();
  }

  withCount(count: number): this {
    this._count = count;
    return this;
  }

  withRoleDistribution(roleDistribution: Partial<Record<TestUserRole, number>>): this {
    this._roleDistribution = roleDistribution;
    return this;
  }

  withActivationStatus(isActivated: boolean): this {
    this._isActivated = isActivated;
    return this;
  }

  withNamePattern(pattern: string): this {
    this._namePattern = pattern;
    return this;
  }

  async build(): Promise<ReadonlyArray<TestUser>> {
    if (this._roleDistribution) {
      return this.buildWithRoles();
    }

    // Optimized parallel creation for large datasets
    const createPromises = Array.from({ length: this._count }, (_, i) =>
      createTestUser({
        id: `test-user-${i + 1}`,
        username: `user${i + 1}`,
        email: `user${i + 1}@test.com`,
        firstName: this._namePattern ? `${this._namePattern}${i + 1}` : `Test${i + 1}`,
        isActivated: this._isActivated,
        createdAt: new Date(this._nextTimestamp + i * TestDataFactory.TIMESTAMP_INCREMENT),
      }),
    );

    return Promise.all(createPromises) as Promise<TestUser[]>;
  }

  private async buildWithRoles(): Promise<ReadonlyArray<TestUser>> {
    const roles: TestUserRole[] = ['ADMIN', 'USER', 'MODERATOR'];
    const defaultDistribution = { ADMIN: 3, USER: 5, MODERATOR: 2 };
    const distribution = { ...defaultDistribution, ...this._roleDistribution };

    let index = 1;

    // Batch create users by role for better performance
    const rolePromises = roles.map(async (role) => {
      const count = distribution[role] || 0;
      const roleUsers = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          createTestUser({
            role,
            id: `test-user-${index + i}`,
            firstName: `${role}User${i + 1}`,
            isActivated: this._isActivated,
            createdAt: new Date(
              this._nextTimestamp + (index + i) * TestDataFactory.TIMESTAMP_INCREMENT,
            ),
          }),
        ),
      );
      index += count;
      return roleUsers;
    });

    const roleResults = await Promise.all(rolePromises);
    return roleResults
      .flat()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) as TestUser[];
  }
}

// ============================================================================
// Advanced Assertion Helpers
// ============================================================================

/**
 * Semantic assertion helpers with detailed error messages for better debugging
 */
class PaginationAssertions {
  static expectValidPaginationResponse<T>(
    response: PaginationResponse<T>,
    options: PaginationValidationOptions,
  ): void {
    const { length, hasNext, hasPrev, totalCount, errorMessage } = options;
    const context = errorMessage ? ` [${errorMessage}]` : '';

    expect(response.data, `Data length mismatch${context}`).toHaveLength(length);
    expect(response.pagination.hasNextPage, `hasNextPage mismatch${context}`).toBe(hasNext);
    expect(response.pagination.hasPreviousPage, `hasPreviousPage mismatch${context}`).toBe(hasPrev);

    if (totalCount !== undefined) {
      expect(response.pagination.totalCount, `Total count mismatch${context}`).toBe(totalCount);
    }

    expect(response.links.self, `Self link missing${context}`).toBeDefined();

    if (hasNext) {
      expect(response.links.next, `Next link missing when hasNext=true${context}`).toBeDefined();
    } else {
      expect(response.links.next, `Next link present when hasNext=false${context}`).toBeUndefined();
    }

    if (hasPrev) {
      expect(response.links.prev, `Prev link missing when hasPrev=true${context}`).toBeDefined();
    }
  }

  static expectValidRFC8288Links(links: PaginationLinks): void {
    // RFC 8288 Web Linking standard validation
    const linkPattern = /^https?:\/\/.+/;

    expect(links.self, 'Self link must be a valid URL').toMatch(linkPattern);
    if (links.first) expect(links.first, 'First link must be a valid URL').toMatch(linkPattern);
    if (links.next) expect(links.next, 'Next link must be a valid URL').toMatch(linkPattern);
    if (links.prev) expect(links.prev, 'Prev link must be a valid URL').toMatch(linkPattern);
    if (links.last) expect(links.last, 'Last link must be a valid URL').toMatch(linkPattern);
  }

  static expectValidLinkHeaderFormat(linkHeader: string): void {
    // RFC 8288 Link header format validation
    const headerPattern = /^<[^>]+>;\s*rel="[^"]+"(,\s*<[^>]+>;\s*rel="[^"]+")*$/;
    expect(linkHeader, 'Link header must follow RFC 8288 format').toMatch(headerPattern);

    // Verify each link segment
    const segments = linkHeader.split(',');
    segments.forEach((segment) => {
      expect(segment.trim(), 'Each link segment must be properly formatted').toMatch(
        /<[^>]+>;\s*rel="[^"]+"/,
      );
    });
  }

  static expectConsistentOrdering<T extends { createdAt: Date }>(
    page1: T[],
    page2: T[],
    orderDirection: 'asc' | 'desc' = 'asc',
  ): void {
    if (page1.length === 0 || page2.length === 0) return;

    const lastItemPage1 = page1[page1.length - 1];
    const firstItemPage2 = page2[0];

    if (orderDirection === 'asc') {
      expect(
        lastItemPage1.createdAt.getTime(),
        'Ascending order violation between pages',
      ).toBeLessThanOrEqual(firstItemPage2.createdAt.getTime());
    } else {
      expect(
        lastItemPage1.createdAt.getTime(),
        'Descending order violation between pages',
      ).toBeGreaterThanOrEqual(firstItemPage2.createdAt.getTime());
    }
  }

  static expectNoDataOverlap<T extends { id: string }>(
    page1: T[],
    page2: T[],
    message = 'Data should not overlap between pages',
  ): void {
    const page1Ids = new Set(page1.map((item) => item.id));
    const page2Ids = new Set(page2.map((item) => item.id));

    const overlap = Array.from(page1Ids).filter((id) => page2Ids.has(id));
    expect(overlap, message).toHaveLength(0);
  }
}

// ============================================================================
// Performance-Optimized Test Utilities
// ============================================================================

/**
 * Test utilities with intelligent caching and performance optimizations
 */
class PaginationTestUtils {
  private static readonly BASE_URL = 'https://api.example.com/users';
  private static _fixtures = new Map<string, PaginationTestFixture>();

  static async getOptimizedFixture(itemCount: number = 10): Promise<PaginationTestFixture> {
    const cacheKey = `fixture-${itemCount}`;

    // Return cached fixture if available
    if (this._fixtures.has(cacheKey)) {
      return this._fixtures.get(cacheKey)!;
    }

    // Create and cache new fixture
    const service = new PrismaPaginationService(testDb, this.BASE_URL);
    const testData = await TestDataFactory.create().withCount(itemCount).build();

    const fixture: PaginationTestFixture = {
      service,
      baseUrl: this.BASE_URL,
      testData,
    };

    this._fixtures.set(cacheKey, fixture);
    return fixture;
  }

  static clearCache(): void {
    this._fixtures.clear();
  }

  static extractCursorFromUrl(url: string): string {
    const match = url.match(/cursor=([^&]+)/);
    if (!match) throw new Error(`No cursor found in URL: ${url}`);
    return decodeURIComponent(match[1]);
  }

  static extractPageFromUrl(url: string): number {
    const match = url.match(/page=(\d+)/);
    if (!match) throw new Error(`No page number found in URL: ${url}`);
    return parseInt(match[1], 10);
  }

  static async measurePerformance<T>(
    operation: () => Promise<T>,
    maxTime: number,
    operationName: string,
  ): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    const result = await operation();
    const executionTime = performance.now() - startTime;

    expect(
      executionTime,
      `${operationName} took ${executionTime}ms, exceeding ${maxTime}ms threshold`,
    ).toBeLessThan(maxTime);

    return { result, executionTime, operationName };
  }

  static async navigateToLastPage<T>(
    service: PrismaPaginationService,
    limit: number,
    orderBy: any,
  ): Promise<PaginationResponse<T>> {
    let result = await service.paginateWithCursor<T>({
      model: 'user',
      limit,
      orderBy,
    });

    while (result.links.next) {
      const cursor = this.extractCursorFromUrl(result.links.next);
      result = await service.paginateWithCursor<T>({
        model: 'user',
        cursor,
        limit,
        orderBy,
      });
    }

    return result;
  }
}

// ============================================================================
// Test Data Constants
// ============================================================================

const CURSOR_PAGINATION_CASES: ReadonlyArray<CursorTestCase> = [
  { name: 'small dataset', limit: 3, expectedPages: 4, totalItems: 10 },
  { name: 'exact division', limit: 5, expectedPages: 4, totalItems: 20 },
  { name: 'single item pages', limit: 1, expectedPages: 15, totalItems: 15 },
  { name: 'larger pages', limit: 10, expectedPages: 3, totalItems: 25 },
] as const;

const VALIDATION_ERROR_CASES: ReadonlyArray<ErrorTestCase> = [
  {
    name: 'limit too low',
    options: { model: 'user', limit: 0 },
    expectedError: /Limit must be between 1 and 100/,
  },
  {
    name: 'limit too high',
    options: { model: 'user', limit: 101 },
    expectedError: /Limit must be between 1 and 100/,
  },
  {
    name: 'invalid cursor',
    options: { model: 'user', cursor: 'invalid', limit: 10 },
    expectedError: /Invalid cursor format/,
  },
  {
    name: 'page zero',
    options: { model: 'user', page: 0, limit: 10 },
    expectedError: /Page must be at least 1/,
  },
  {
    name: 'negative page',
    options: { model: 'user', page: -1, limit: 10 },
    expectedError: /Page must be at least 1/,
  },
] as const;

const ROLE_FILTER_CASES: ReadonlyArray<RoleFilterCase> = [
  { role: 'ADMIN', expectedCount: 3 },
  { role: 'USER', expectedCount: 5 },
  { role: 'MODERATOR', expectedCount: 2 },
] as const;

const OFFSET_PAGINATION_CASES: ReadonlyArray<OffsetTestCase> = [
  { totalItems: 25, limit: 5, page: 1, expectedLength: 5, hasNext: true, hasPrev: false },
  { totalItems: 25, limit: 5, page: 3, expectedLength: 5, hasNext: true, hasPrev: true },
  { totalItems: 25, limit: 5, page: 5, expectedLength: 5, hasNext: false, hasPrev: true },
  { totalItems: 23, limit: 10, page: 3, expectedLength: 3, hasNext: false, hasPrev: true },
] as const;

const PERFORMANCE_BENCHMARK_CASES = [
  { name: 'large dataset', itemCount: 1000, limit: 50, maxTime: 5000 },
  { name: 'complex filters', itemCount: 500, limit: 25, maxTime: 3000 },
] as const;

// ============================================================================
// Main Test Suite
// ============================================================================

describe('PrismaPaginationService', () => {
  let fixture: PaginationTestFixture;

  beforeEach(async () => {
    await cleanupTestData();
    PaginationTestUtils.clearCache();
    fixture = await PaginationTestUtils.getOptimizedFixture();
  });

  afterEach(() => {
    PaginationTestUtils.clearCache();
  });

  describe('Cursor Pagination', () => {
    describe.each(CURSOR_PAGINATION_CASES)(
      '$name scenario',
      ({ limit, expectedPages, totalItems }) => {
        beforeEach(async () => {
          await cleanupTestData();
          fixture = await PaginationTestUtils.getOptimizedFixture(totalItems);
        });

        it('should handle first page correctly', async () => {
          const result = await fixture.service.paginateWithCursor<TestUser>({
            model: 'user',
            limit,
            orderBy: { createdAt: 'asc' },
          });

          PaginationAssertions.expectValidPaginationResponse(result, {
            length: Math.min(limit, totalItems),
            hasNext: totalItems > limit,
            hasPrev: false,
            totalCount: totalItems,
            errorMessage: `First page of ${totalItems} items with limit ${limit}`,
          });

          PaginationAssertions.expectValidRFC8288Links(result.links);
        });

        it('should handle middle pages correctly', async () => {
          if (expectedPages < 2) return; // Skip for single page scenarios

          const firstPage = await fixture.service.paginateWithCursor<TestUser>({
            model: 'user',
            limit,
            orderBy: { createdAt: 'asc' },
          });

          if (!firstPage.links.next) return;

          const cursor = PaginationTestUtils.extractCursorFromUrl(firstPage.links.next);
          const result = await fixture.service.paginateWithCursor<TestUser>({
            model: 'user',
            cursor,
            limit,
            orderBy: { createdAt: 'asc' },
          });

          PaginationAssertions.expectValidPaginationResponse(result, {
            length: Math.min(limit, totalItems - limit),
            hasNext: totalItems > limit * 2,
            hasPrev: true,
            errorMessage: `Middle page with cursor from first page`,
          });

          PaginationAssertions.expectNoDataOverlap(firstPage.data, result.data);
          PaginationAssertions.expectConsistentOrdering(firstPage.data, result.data, 'asc');
        });

        it('should handle last page correctly', async () => {
          if (totalItems <= limit) return; // Skip single page scenarios

          const lastPage = await PaginationTestUtils.navigateToLastPage<TestUser>(
            fixture.service,
            limit,
            { createdAt: 'asc' },
          );

          const expectedLastPageSize = totalItems % limit || limit;
          PaginationAssertions.expectValidPaginationResponse(lastPage, {
            length: expectedLastPageSize,
            hasNext: false,
            hasPrev: true,
            errorMessage: `Last page of ${totalItems} items with limit ${limit}`,
          });
        });
      },
    );

    describe('filtering and ordering', () => {
      beforeEach(async () => {
        await cleanupTestData();
        await TestDataFactory.create()
          .withRoleDistribution({ ADMIN: 3, USER: 5, MODERATOR: 2 })
          .build();
      });

      it.each(ROLE_FILTER_CASES)(
        'should filter by role: $role',
        async ({ role, expectedCount }) => {
          const result = await fixture.service.paginateWithCursor<TestUser>({
            model: 'user',
            limit: 10,
            where: { role },
            orderBy: { createdAt: 'asc' },
          });

          expect(result.data).toHaveLength(expectedCount);
          expect(result.pagination.totalCount).toBe(expectedCount);
          expect(result.data.every((user) => user.role === role)).toBe(true);
          expect(result.links.self).toContain(`role=${role}`);
        },
      );

      it('should handle complex where conditions', async () => {
        const result = await fixture.service.paginateWithCursor<TestUser>({
          model: 'user',
          limit: 10,
          where: {
            role: { in: ['ADMIN', 'MODERATOR'] },
            isActivated: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        expect(
          result.data.every(
            (user) => ['ADMIN', 'MODERATOR'].includes(user.role) && user.isActivated,
          ),
        ).toBe(true);
      });

      it('should maintain order consistency across pages', async () => {
        const page1 = await fixture.service.paginateWithCursor<TestUser>({
          model: 'user',
          limit: 3,
          orderBy: { createdAt: 'asc' },
        });

        if (!page1.links.next) return;

        const cursor = PaginationTestUtils.extractCursorFromUrl(page1.links.next);
        const page2 = await fixture.service.paginateWithCursor<TestUser>({
          model: 'user',
          cursor,
          limit: 3,
          orderBy: { createdAt: 'asc' },
        });

        PaginationAssertions.expectConsistentOrdering(page1.data, page2.data, 'asc');
      });
    });

    describe('edge cases', () => {
      it('should handle empty dataset', async () => {
        await cleanupTestData();

        const result = await fixture.service.paginateWithCursor<TestUser>({
          model: 'user',
          limit: 10,
          orderBy: { createdAt: 'asc' },
        });

        PaginationAssertions.expectValidPaginationResponse(result, {
          length: 0,
          hasNext: false,
          hasPrev: false,
          totalCount: 0,
          errorMessage: 'Empty dataset pagination',
        });
      });

      it('should handle single item dataset', async () => {
        await cleanupTestData();
        await createTestUser();

        const result = await fixture.service.paginateWithCursor<TestUser>({
          model: 'user',
          limit: 10,
          orderBy: { createdAt: 'asc' },
        });

        PaginationAssertions.expectValidPaginationResponse(result, {
          length: 1,
          hasNext: false,
          hasPrev: false,
          totalCount: 1,
          errorMessage: 'Single item pagination',
        });
      });

      it('should handle limit equal to total count', async () => {
        await cleanupTestData();
        const itemCount = 5;
        await TestDataFactory.create().withCount(itemCount).build();

        const result = await fixture.service.paginateWithCursor<TestUser>({
          model: 'user',
          limit: itemCount,
          orderBy: { createdAt: 'asc' },
        });

        PaginationAssertions.expectValidPaginationResponse(result, {
          length: itemCount,
          hasNext: false,
          hasPrev: false,
          totalCount: itemCount,
          errorMessage: 'Limit equals total count',
        });
      });

      it('should handle rapid pagination navigation', async () => {
        const pageResults: PaginationResponse<TestUser>[] = [];
        let currentCursor: string | undefined;

        for (let i = 0; i < 3; i++) {
          const result = await fixture.service.paginateWithCursor<TestUser>({
            model: 'user',
            cursor: currentCursor,
            limit: 3,
            orderBy: { createdAt: 'asc' },
          });

          pageResults.push(result);
          if (!result.links.next) break;
          currentCursor = PaginationTestUtils.extractCursorFromUrl(result.links.next);
        }

        // Verify no data overlap between any pages
        for (let i = 0; i < pageResults.length - 1; i++) {
          PaginationAssertions.expectNoDataOverlap(
            pageResults[i].data,
            pageResults[i + 1].data,
            `No overlap between page ${i + 1} and ${i + 2}`,
          );
        }
      });
    });
  });

  describe('Offset Pagination', () => {
    describe.each(OFFSET_PAGINATION_CASES)(
      'pagination scenarios',
      ({ totalItems, limit, page, expectedLength, hasNext, hasPrev }) => {
        beforeEach(async () => {
          await cleanupTestData();
          fixture = await PaginationTestUtils.getOptimizedFixture(totalItems);
        });

        it(`should handle page ${page} of ${Math.ceil(totalItems / limit)} pages`, async () => {
          const result = await fixture.service.paginateWithOffset<TestUser>({
            model: 'user',
            page,
            limit,
            orderBy: { createdAt: 'asc' },
          });

          expect(result.data).toHaveLength(expectedLength);
          expect(result.pagination.hasNextPage).toBe(hasNext);
          expect(result.pagination.hasPreviousPage).toBe(hasPrev);
          expect(result.pagination.currentPage).toBe(page);
          expect(result.pagination.totalPages).toBe(Math.ceil(totalItems / limit));
          expect(result.pagination.totalCount).toBe(totalItems);

          PaginationAssertions.expectValidRFC8288Links(result.links);
        });
      },
    );

    it('should handle field selection', async () => {
      const result = await fixture.service.paginateWithOffset<Partial<TestUser>>({
        model: 'user',
        page: 1,
        limit: 5,
        select: { id: true, username: true, email: true },
      });

      expect(result.data).toHaveLength(5);
      const firstUser = result.data[0] as any;

      // Verify selected fields are present
      expect(firstUser).toHaveProperty('id');
      expect(firstUser).toHaveProperty('username');
      expect(firstUser).toHaveProperty('email');

      // Verify unselected fields are absent
      expect(firstUser).not.toHaveProperty('firstName');
      expect(firstUser).not.toHaveProperty('lastName');
    });

    it('should generate correct page links', async () => {
      await TestDataFactory.create().withCount(20).withRoleDistribution({ USER: 20 }).build();

      const result = await fixture.service.paginateWithOffset<TestUser>({
        model: 'user',
        page: 2,
        limit: 5,
        where: { role: 'USER' },
      });

      expect(result.links.self).toContain('page=2');
      expect(result.links.first).toContain('page=1');
      if (result.links.prev) expect(result.links.prev).toContain('page=1');
      if (result.links.next) expect(result.links.next).toContain('page=3');
      expect(result.links.self).toContain('role=USER');
    });

    it('should handle boundary pages correctly', async () => {
      const totalItems = 15;
      const limit = 10;
      await cleanupTestData();
      await TestDataFactory.create().withCount(totalItems).build();

      // Test first page
      const firstPage = await fixture.service.paginateWithOffset<TestUser>({
        model: 'user',
        page: 1,
        limit,
        orderBy: { createdAt: 'asc' },
      });

      expect(firstPage.data).toHaveLength(limit);
      expect(firstPage.links.prev).toBeUndefined();
      expect(firstPage.links.next).toBeDefined();

      // Test last page
      const lastPage = await fixture.service.paginateWithOffset<TestUser>({
        model: 'user',
        page: 2,
        limit,
        orderBy: { createdAt: 'asc' },
      });

      expect(lastPage.data).toHaveLength(totalItems - limit);
      expect(lastPage.links.prev).toBeDefined();
      expect(lastPage.links.next).toBeUndefined();
    });
  });

  describe('Link Header Generation', () => {
    it('should generate RFC 8288 compliant link headers', async () => {
      const result = await fixture.service.paginateWithCursor<TestUser>({
        model: 'user',
        limit: 3,
        orderBy: { createdAt: 'asc' },
      });

      const linkHeader = fixture.service.toLinkHeader(result.links);

      PaginationAssertions.expectValidLinkHeaderFormat(linkHeader);

      expect(linkHeader).toContain('rel="self"');
      expect(linkHeader).toContain('rel="first"');
      if (result.links.next) {
        expect(linkHeader).toContain('rel="next"');
      }
    });

    it('should handle all link types', () => {
      const links: PaginationLinks = {
        self: 'https://api.example.com/users?page=2',
        first: 'https://api.example.com/users?page=1',
        prev: 'https://api.example.com/users?page=1',
        next: 'https://api.example.com/users?page=3',
        last: 'https://api.example.com/users?page=10',
      };

      const linkHeader = fixture.service.toLinkHeader(links);

      PaginationAssertions.expectValidLinkHeaderFormat(linkHeader);

      expect(linkHeader).toContain('rel="self"');
      expect(linkHeader).toContain('rel="first"');
      expect(linkHeader).toContain('rel="prev"');
      expect(linkHeader).toContain('rel="next"');
      expect(linkHeader).toContain('rel="last"');

      // Verify proper comma separation
      const segments = linkHeader.split(',');
      expect(segments).toHaveLength(5);
    });

    it('should handle special characters in URLs', () => {
      const links: PaginationLinks = {
        self: 'https://api.example.com/users?filter=special%20chars&limit=10',
        first: 'https://api.example.com/users?filter=special%20chars&limit=10',
        next: 'https://api.example.com/users?filter=special%20chars&limit=10&cursor=next123',
      };

      const linkHeader = fixture.service.toLinkHeader(links);

      PaginationAssertions.expectValidLinkHeaderFormat(linkHeader);

      expect(linkHeader).toContain('filter=special%20chars');
      expect(linkHeader).toContain('limit=10');
    });
  });

  describe('Error Handling', () => {
    describe.each(VALIDATION_ERROR_CASES)(
      'validation errors',
      ({ name, options, expectedError }) => {
        it(`should reject ${name}`, async () => {
          const method = 'page' in options ? 'paginateWithOffset' : 'paginateWithCursor';

          await expect(fixture.service[method](options)).rejects.toThrow(expectedError);
        });
      },
    );

    it('should handle unknown model gracefully', async () => {
      await expect(
        fixture.service.paginateWithCursor<TestUser>({
          model: 'nonexistentModel',
          limit: 10,
        }),
      ).rejects.toThrow(/Unknown Prisma model/);
    });

    it('should handle database connection errors', async () => {
      const disconnectedService = new PrismaPaginationService(
        {
          $connect: vi.fn(),
          $disconnect: vi.fn(),
          $transaction: vi.fn().mockRejectedValue(new Error('Connection failed')),
        } as any,
        'test',
      );

      await expect(
        disconnectedService.paginateWithCursor<TestUser>({
          model: 'user',
          limit: 10,
        }),
      ).rejects.toThrow('Connection failed');
    });

    it('should validate cursor format strictly', async () => {
      const invalidCursors = [
        'not-base64',
        '{}',
        Buffer.from('invalid-json').toString('base64'),
        Buffer.from('{"missing": "fields"}').toString('base64'),
      ];

      for (const invalidCursor of invalidCursors) {
        await expect(
          fixture.service.paginateWithCursor<TestUser>({
            model: 'user',
            cursor: invalidCursor,
            limit: 10,
          }),
        ).rejects.toThrow(/Invalid cursor/);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it.each(PERFORMANCE_BENCHMARK_CASES)(
      'should handle $name efficiently',
      { timeout: 10000 },
      async ({ itemCount, limit, maxTime }) => {
        await cleanupTestData();
        const largeFixture = await PaginationTestUtils.getOptimizedFixture(itemCount);

        const metrics = await PaginationTestUtils.measurePerformance(
          () =>
            largeFixture.service.paginateWithCursor<TestUser>({
              model: 'user',
              limit,
              orderBy: { createdAt: 'asc' },
            }),
          maxTime,
          `Pagination of ${itemCount} items`,
        );

        expect(metrics.result.data).toHaveLength(Math.min(limit, itemCount));
        expect(metrics.result.pagination.totalCount).toBe(itemCount);

        // Log performance for monitoring
        console.log(
          `Performance: ${metrics.operationName} completed in ${metrics.executionTime}ms`,
        );
      },
    );

    it('should perform well with complex filters', async () => {
      await cleanupTestData();
      await TestDataFactory.create()
        .withCount(500)
        .withRoleDistribution({ ADMIN: 100, USER: 300, MODERATOR: 100 })
        .build();

      const metrics = await PaginationTestUtils.measurePerformance(
        () =>
          fixture.service.paginateWithCursor<TestUser>({
            model: 'user',
            limit: 25,
            where: {
              role: { in: ['ADMIN', 'MODERATOR'] },
              isActivated: true,
              firstName: { not: null },
            },
            orderBy: { createdAt: 'desc' },
          }),
        3000,
        'Complex filter pagination',
      );

      expect(metrics.result.data.length).toBeGreaterThan(0);
      expect(
        metrics.result.data.every((user: TestUser) => ['ADMIN', 'MODERATOR'].includes(user.role)),
      ).toBe(true);
    });
  });

  describe('Transaction Consistency', () => {
    it('should maintain data consistency during pagination', async () => {
      const result1 = await fixture.service.paginateWithCursor<TestUser>({
        model: 'user',
        limit: 5,
        orderBy: { createdAt: 'asc' },
      });

      // Simulate concurrent data modification
      await createTestUser({
        id: 'concurrent-user',
        createdAt: new Date(Date.now() + 10000),
      });

      if (!result1.links.next) return;

      const cursor = PaginationTestUtils.extractCursorFromUrl(result1.links.next);
      const result2 = await fixture.service.paginateWithCursor<TestUser>({
        model: 'user',
        cursor,
        limit: 5,
        orderBy: { createdAt: 'asc' },
      });

      // Should not include the concurrently added user in this pagination sequence
      expect(result2.data.every((user) => user.id !== 'concurrent-user')).toBe(true);
    });

    it('should handle concurrent reads correctly', async () => {
      const promises = Array.from({ length: 3 }, () =>
        fixture.service.paginateWithCursor<TestUser>({
          model: 'user',
          limit: 3,
          orderBy: { createdAt: 'asc' },
        }),
      );

      const results = await Promise.all(promises);

      // All concurrent reads should return consistent data
      expect(results[0].data).toEqual(results[1].data);
      expect(results[1].data).toEqual(results[2].data);
      expect(results[0].pagination.totalCount).toBe(results[1].pagination.totalCount);
    });

    it('should handle transaction rollback scenarios', async () => {
      const mockPrisma = {
        $transaction: vi.fn().mockImplementation(async (callback) => {
          // Simulate a transaction that may fail
          try {
            return await callback({
              user: {
                count: vi.fn().mockResolvedValue(10),
                findMany: vi.fn().mockRejectedValue(new Error('Transaction rolled back')),
              },
            });
          } catch (error) {
            throw error;
          }
        }),
      } as any;

      const transactionService = new PrismaPaginationService(mockPrisma, 'test');

      await expect(
        transactionService.paginateWithCursor<TestUser>({
          model: 'user',
          limit: 10,
        }),
      ).rejects.toThrow('Transaction rolled back');
    });
  });

  describe('Integration Scenarios', () => {
    it('should support mixed pagination strategies', async () => {
      await cleanupTestData();
      await TestDataFactory.create().withCount(50).build();

      // Start with cursor pagination
      const cursorResult = await fixture.service.paginateWithCursor<TestUser>({
        model: 'user',
        limit: 10,
        orderBy: { createdAt: 'asc' },
      });

      // Switch to offset pagination for specific page
      const offsetResult = await fixture.service.paginateWithOffset<TestUser>({
        model: 'user',
        page: 3,
        limit: 10,
        orderBy: { createdAt: 'asc' },
      });

      expect(cursorResult.data).toHaveLength(10);
      expect(offsetResult.data).toHaveLength(10);

      // Verify different pagination methods return consistent total counts
      expect(cursorResult.pagination.totalCount).toBe(offsetResult.pagination.totalCount);
    });

    it('should handle complex real-world query patterns', async () => {
      await cleanupTestData();

      // Create realistic user distribution
      await TestDataFactory.create()
        .withCount(100)
        .withRoleDistribution({ ADMIN: 5, USER: 85, MODERATOR: 10 })
        .withActivationStatus(true)
        .build();

      // Create some inactive users
      await TestDataFactory.create()
        .withCount(20)
        .withRoleDistribution({ USER: 20 })
        .withActivationStatus(false)
        .build();

      // Complex query with multiple conditions
      const result = await fixture.service.paginateWithCursor<TestUser>({
        model: 'user',
        limit: 15,
        where: {
          AND: [{ isActivated: true }, { role: { in: ['USER', 'MODERATOR'] } }],
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      });

      expect(result.data).toHaveLength(15);
      expect(result.pagination.totalCount).toBe(95); // 85 active users + 10 active moderators
      expect(result.data.every((user) => user.isActivated)).toBe(true);
      expect(result.data.every((user) => ['USER', 'MODERATOR'].includes(user.role))).toBe(true);
    });
  });
});
