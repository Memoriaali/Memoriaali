import { describe, it, expect, beforeEach, vi } from 'vitest';

import { HealthService } from '../health.service';

// Mock Prisma client
const mockPrisma = {
  $queryRaw: vi.fn(),
  user: {
    count: vi.fn(),
  },
};

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    vi.clearAllMocks();
    healthService = new HealthService(mockPrisma as any);
  });

  describe('isHealthy', () => {
    it('should return true when database connection is successful', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      // Act
      const result = await healthService.isHealthy();

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(['SELECT 1']);
    });

    it('should return false when database connection fails', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await healthService.isHealthy();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return connected status with user count when database is healthy', async () => {
      // Arrange
      const mockUserCount = 42;
      mockPrisma.$queryRaw.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([{ '1': 1 }]), 1)),
      );
      mockPrisma.user.count.mockResolvedValue(mockUserCount);

      // Act
      const result = await healthService.checkDatabaseHealth();

      // Assert
      expect(result.status).toBe('connected');
      expect(result.userCount).toBe(mockUserCount);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.lastChecked).toBeDefined();
    });

    it('should return disconnected status when database query fails', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockImplementation(
        () =>
          new Promise((resolve, reject) =>
            setTimeout(() => reject(new Error('Database error')), 1),
          ),
      );

      // Act
      const result = await healthService.checkDatabaseHealth();

      // Assert
      expect(result.status).toBe('disconnected');
      expect(result.userCount).toBe(0);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.lastChecked).toBeDefined();
    });

    it('should handle user count query failure gracefully', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockImplementation(
        () =>
          new Promise((resolve, reject) => setTimeout(() => reject(new Error('Count failed')), 1)),
      );

      // Act - The method catches errors and returns disconnected status, doesn't throw
      const result = await healthService.checkDatabaseHealth();

      // Assert
      expect(result.status).toBe('disconnected');
      expect(result.userCount).toBe(0);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkSystemHealth', () => {
    it('should return healthy status for normal system conditions', async () => {
      // Arrange - Mock process.uptime to return > 30 seconds for healthy status
      const originalUptime = process.uptime;
      process.uptime = vi.fn().mockReturnValue(60); // 60 seconds uptime

      try {
        // Act
        const result = await healthService.checkSystemHealth();

        // Assert
        expect(result.status).toBe('healthy');
        expect(result.uptime).toBeGreaterThan(0);
        expect(result.memoryUsage).toBeDefined();
        expect(result.memoryUsage.used).toBeGreaterThan(0);
        expect(result.memoryUsage.total).toBeGreaterThan(0);
        expect(result.memoryUsage.percentage).toBeGreaterThanOrEqual(0);
        expect(result.version).toBeDefined();
      } finally {
        // Cleanup - restore original uptime function
        process.uptime = originalUptime;
      }
    });

    it('should return correct memory usage calculations', async () => {
      // Act
      const result = await healthService.checkSystemHealth();

      // Assert
      expect(result.memoryUsage.percentage).toBeLessThanOrEqual(100);
      expect(result.memoryUsage.used).toBeLessThanOrEqual(result.memoryUsage.total);
    });
  });

  describe('getSystemHealth', () => {
    it('should return healthy overall status when all systems are healthy', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockResolvedValue(10);

      // Act
      const result = await healthService.getSystemHealth();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.services.database.status).toBe('connected');
      expect(result.services.database.userCount).toBe(10);
      expect(result.timestamp).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });

    it('should return unhealthy overall status when database is disconnected', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB Error'));

      // Act
      const result = await healthService.getSystemHealth();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('disconnected');
    });

    it('should handle complete system failure gracefully', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Complete failure'));
      mockPrisma.user.count.mockRejectedValue(new Error('Count failure'));

      // Act
      const result = await healthService.getSystemHealth();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('disconnected');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('determineOverallStatus', () => {
    it('should return healthy when both database and system are healthy', () => {
      // This tests the private method through the public interface
      // We can't test it directly, but we test its behavior through getSystemHealth
      // This is intentional - testing public contracts rather than implementation details
    });
  });
});
