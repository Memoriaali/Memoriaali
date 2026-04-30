import { PrismaClient, RequestState } from '@memoriaali/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '../../../shared/errors';
import { AuthenticatedUser } from '../../../shared/types/authenticated-user';
import { ResearchRequestsService } from '../researchrequests.service';

// Mock Prisma client
const mockPrisma = {
  document: {
    findUnique: vi.fn(),
  },
  researchRequest: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
} as unknown as PrismaClient;

const service = new ResearchRequestsService(mockPrisma);

const mockUser = new AuthenticatedUser(
  'user-1',
  'test@example.com',
  'Test',
  'User',
  'USER',
  true,
  true,
);

const mockAdminUser = new AuthenticatedUser(
  'admin-1',
  'admin@example.com',
  'Admin',
  'User',
  'ADMIN',
  true,
  true,
);

describe('ResearchRequestsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createResearchRequest', () => {
    it('should create a research request successfully', async () => {
      const input = {
        documentId: 'doc-1',
        purpose: 'Research for academic paper',
        researchStartDate: '2024-01-01T00:00:00Z',
        researchEndDate: '2024-12-31T23:59:59Z',
      };

      const mockDocument = {
        id: 'doc-1',
        documentPrivacy: 'RESEARCH_ONLY',
      };

      const mockCreatedRequest = {
        id: 'request-1',
        documentId: 'doc-1',
        requestedById: 'user-1',
        state: RequestState.PENDING,
        purpose: 'Research for academic paper',
        researchStartDate: new Date('2024-01-01T00:00:00Z'),
        researchEndDate: new Date('2024-12-31T23:59:59Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-1',
        updatedById: 'user-1',
      };

      mockPrisma.document.findUnique = vi.fn().mockResolvedValue(mockDocument);
      mockPrisma.researchRequest.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.researchRequest.create = vi.fn().mockResolvedValue(mockCreatedRequest);

      const result = await service.createResearchRequest(input, mockUser);

      expect(result).toEqual(mockCreatedRequest);
      expect(mockPrisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        select: { id: true, documentPrivacy: true },
      });
      expect(mockPrisma.researchRequest.create).toHaveBeenCalledWith({
        data: {
          documentId: 'doc-1',
          requestedById: 'user-1',
          purpose: 'Research for academic paper',
          researchStartDate: new Date('2024-01-01T00:00:00Z'),
          researchEndDate: new Date('2024-12-31T23:59:59Z'),
          createdById: 'user-1',
          updatedById: 'user-1',
        },
      });
    });

    it('should throw error if document does not exist', async () => {
      const input = {
        documentId: 'non-existent',
        purpose: 'Research purpose',
      };

      mockPrisma.document.findUnique = vi.fn().mockResolvedValue(null);

      await expect(service.createResearchRequest(input, mockUser)).rejects.toThrow(
        HttpException.notFound(undefined, 'Document not found'),
      );
    });

    it('should throw error if document is not RESEARCH_ONLY', async () => {
      const input = {
        documentId: 'doc-1',
        purpose: 'Research purpose',
      };

      const mockDocument = {
        id: 'doc-1',
        documentPrivacy: 'PUBLIC',
      };

      mockPrisma.document.findUnique = vi.fn().mockResolvedValue(mockDocument);

      await expect(service.createResearchRequest(input, mockUser)).rejects.toThrow(
        HttpException.badRequest(
          undefined,
          'Research requests can only be made for RESEARCH_ONLY documents',
        ),
      );
    });

    it('should throw error if user already has pending request', async () => {
      const input = {
        documentId: 'doc-1',
        purpose: 'Research purpose',
      };

      const mockDocument = {
        id: 'doc-1',
        documentPrivacy: 'RESEARCH_ONLY',
      };

      const existingRequest = {
        id: 'existing-request',
        state: RequestState.PENDING,
      };

      mockPrisma.document.findUnique = vi.fn().mockResolvedValue(mockDocument);
      mockPrisma.researchRequest.findFirst = vi.fn().mockResolvedValue(existingRequest);

      await expect(service.createResearchRequest(input, mockUser)).rejects.toThrow(
        HttpException.conflict(undefined, 'You already have a pending request for this document'),
      );
    });
  });

  describe('getResearchRequestById', () => {
    it('should return research request with relations', async () => {
      const mockRequest = {
        id: 'request-1',
        documentId: 'doc-1',
        requestedById: 'user-1',
        state: RequestState.PENDING,
        purpose: 'Research purpose',
        document: {
          id: 'doc-1',
          fileName: 'test.pdf',
          documentPrivacy: 'RESEARCH_ONLY',
        },
        requestedBy: {
          id: 'user-1',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        },
        approvedBy: null,
        createdBy: {
          id: 'user-1',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        },
        updatedBy: {
          id: 'user-1',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(mockRequest);

      const result = await service.getResearchRequestById('request-1', mockUser);

      expect(result).toEqual(mockRequest);
      expect(mockPrisma.researchRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        include: {
          document: {
            select: {
              id: true,
              fileName: true,
              documentPrivacy: true,
            },
          },
          requestedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },

          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('should throw error if research request not found', async () => {
      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(null);

      await expect(service.getResearchRequestById('non-existent', mockUser)).rejects.toThrow(
        HttpException.notFound(undefined, 'Research request not found'),
      );
    });
  });

  describe('updateResearchRequest', () => {
    it('should update research request successfully', async () => {
      const input = {
        state: RequestState.APPROVED,
        researchStartDate: '2024-01-01T00:00:00Z',
        researchEndDate: '2024-12-31T23:59:59Z',
      };

      const existingRequest = {
        id: 'request-1',
        state: RequestState.PENDING,
        document: {
          userId: 'admin-1',
        },
      };

      const updatedRequest = {
        id: 'request-1',
        state: RequestState.APPROVED,
        approvedById: 'admin-1',
        researchStartDate: new Date('2024-01-01T00:00:00Z'),
        researchEndDate: new Date('2024-12-31T23:59:59Z'),
        updatedById: 'admin-1',
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(existingRequest);
      mockPrisma.researchRequest.update = vi.fn().mockResolvedValue(updatedRequest);

      const result = await service.updateResearchRequest('request-1', input, mockAdminUser);

      expect(result).toEqual(updatedRequest);
      expect(mockPrisma.researchRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: {
          state: RequestState.APPROVED,
          approvedById: 'admin-1',
          rejectionExplanation: undefined,
          researchStartDate: new Date('2024-01-01T00:00:00Z'),
          researchEndDate: new Date('2024-12-31T23:59:59Z'),
          updatedById: 'admin-1',
        },
      });
    });

    it('should require rejection explanation when rejecting', async () => {
      const input = {
        state: RequestState.REJECTED,
      };

      const existingRequest = {
        id: 'request-1',
        state: RequestState.PENDING,
        document: {
          userId: 'admin-1',
        },
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(existingRequest);

      await expect(
        service.updateResearchRequest('request-1', input, mockAdminUser),
      ).rejects.toThrow(
        HttpException.badRequest(
          undefined,
          'Rejection explanation is required when rejecting a request',
        ),
      );
    });
  });

  describe('getResearchRequests', () => {
    it('should return paginated research requests for regular user', async () => {
      const query = {
        page: 1,
        limit: 20,
      };

      const mockRequests = [
        {
          id: 'request-1',
          documentId: 'doc-1',
          requestedById: 'user-1',
          state: RequestState.PENDING,
        },
      ];

      mockPrisma.researchRequest.findMany = vi.fn().mockResolvedValue(mockRequests);
      mockPrisma.researchRequest.count = vi.fn().mockResolvedValue(1);

      const result = await service.getResearchRequests(query, mockUser);

      expect(result.data).toEqual(mockRequests);
      expect(result.pagination).toEqual({
        limit: 20,
        totalCount: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        currentPage: 1,
        totalPages: 1,
      });

      // Should filter by requestedById for regular users
      expect(mockPrisma.researchRequest.findMany).toHaveBeenCalledWith({
        where: { requestedById: 'user-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should return all research requests for admin user', async () => {
      const query = {
        page: 1,
        limit: 20,
      };

      const mockRequests = [
        {
          id: 'request-1',
          documentId: 'doc-1',
          requestedById: 'user-1',
          state: RequestState.PENDING,
        },
        {
          id: 'request-2',
          documentId: 'doc-2',
          requestedById: 'user-2',
          state: RequestState.APPROVED,
        },
      ];

      mockPrisma.researchRequest.findMany = vi.fn().mockResolvedValue(mockRequests);
      mockPrisma.researchRequest.count = vi.fn().mockResolvedValue(2);

      const result = await service.getResearchRequests(query, mockAdminUser);

      expect(result.data).toEqual(mockRequests);
      expect(result.pagination.totalCount).toBe(2);

      // Should not filter by requestedById for admin users
      expect(mockPrisma.researchRequest.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('deleteResearchRequest', () => {
    it('should delete research request successfully', async () => {
      const mockRequest = {
        id: 'request-1',
        requestedById: 'user-1',
        state: RequestState.PENDING,
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(mockRequest);
      mockPrisma.researchRequest.delete = vi.fn().mockResolvedValue(mockRequest);

      await service.deleteResearchRequest('request-1', mockUser);

      expect(mockPrisma.researchRequest.delete).toHaveBeenCalledWith({
        where: { id: 'request-1' },
      });
    });

    it('should throw error if user is not requester or admin', async () => {
      const mockRequest = {
        id: 'request-1',
        requestedById: 'other-user',
        state: RequestState.PENDING,
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(mockRequest);

      await expect(service.deleteResearchRequest('request-1', mockUser)).rejects.toThrow(
        HttpException.forbidden(
          undefined,
          'You do not have permission to delete this research request',
        ),
      );
    });

    it('should throw error if request is not pending', async () => {
      const mockRequest = {
        id: 'request-1',
        requestedById: 'user-1',
        state: RequestState.APPROVED,
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(mockRequest);

      await expect(service.deleteResearchRequest('request-1', mockUser)).rejects.toThrow(
        HttpException.badRequest(undefined, 'Only pending requests can be deleted'),
      );
    });
  });

  describe('approveResearchRequest', () => {
    it('should approve research request successfully', async () => {
      const existingRequest = {
        id: 'request-1',
        state: RequestState.PENDING,
        document: {
          userId: 'admin-1',
        },
      };

      const updatedRequest = {
        id: 'request-1',
        state: RequestState.APPROVED,
        approvedById: 'admin-1',
        updatedById: 'admin-1',
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(existingRequest);
      mockPrisma.researchRequest.update = vi.fn().mockResolvedValue(updatedRequest);

      const result = await service.approveResearchRequest('request-1', mockAdminUser);

      expect(result).toEqual(updatedRequest);
      expect(mockPrisma.researchRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: {
          state: RequestState.APPROVED,
          approvedById: 'admin-1',
          updatedById: 'admin-1',
        },
      });
    });

    it('should throw error if research request not found', async () => {
      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(null);

      await expect(service.approveResearchRequest('non-existent', mockAdminUser)).rejects.toThrow(
        HttpException.notFound(undefined, 'Research request not found'),
      );
    });

    it('should throw error if user is not authorized', async () => {
      const existingRequest = {
        id: 'request-1',
        state: RequestState.PENDING,
        document: {
          userId: 'other-user',
        },
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(existingRequest);

      await expect(service.approveResearchRequest('request-1', mockUser)).rejects.toThrow(
        HttpException.forbidden(
          undefined,
          'You do not have permission to approve this research request',
        ),
      );
    });

    it('should throw error if request is not pending', async () => {
      const existingRequest = {
        id: 'request-1',
        state: RequestState.APPROVED,
        document: {
          userId: 'admin-1',
        },
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(existingRequest);

      await expect(service.approveResearchRequest('request-1', mockAdminUser)).rejects.toThrow(
        HttpException.badRequest(undefined, 'Only pending requests can be approved'),
      );
    });
  });

  describe('rejectResearchRequest', () => {
    it('should reject research request successfully', async () => {
      const existingRequest = {
        id: 'request-1',
        state: RequestState.PENDING,
        document: {
          userId: 'admin-1',
        },
      };

      const updatedRequest = {
        id: 'request-1',
        state: RequestState.REJECTED,
        approvedById: 'admin-1',
        rejectionExplanation: 'Insufficient research justification',
        updatedById: 'admin-1',
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(existingRequest);
      mockPrisma.researchRequest.update = vi.fn().mockResolvedValue(updatedRequest);

      const result = await service.rejectResearchRequest(
        'request-1',
        'Insufficient research justification',
        mockAdminUser,
      );

      expect(result).toEqual(updatedRequest);
      expect(mockPrisma.researchRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: {
          state: RequestState.REJECTED,
          approvedById: 'admin-1',
          rejectionExplanation: 'Insufficient research justification',
          updatedById: 'admin-1',
        },
      });
    });

    it('should throw error if research request not found', async () => {
      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(null);

      await expect(
        service.rejectResearchRequest('non-existent', 'Reason', mockAdminUser),
      ).rejects.toThrow(HttpException.notFound(undefined, 'Research request not found'));
    });

    it('should throw error if user is not authorized', async () => {
      const existingRequest = {
        id: 'request-1',
        state: RequestState.PENDING,
        document: {
          userId: 'other-user',
        },
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(existingRequest);

      await expect(service.rejectResearchRequest('request-1', 'Reason', mockUser)).rejects.toThrow(
        HttpException.forbidden(
          undefined,
          'You do not have permission to reject this research request',
        ),
      );
    });

    it('should throw error if request is not pending', async () => {
      const existingRequest = {
        id: 'request-1',
        state: RequestState.APPROVED,
        document: {
          userId: 'admin-1',
        },
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(existingRequest);

      await expect(
        service.rejectResearchRequest('request-1', 'Reason', mockAdminUser),
      ).rejects.toThrow(
        HttpException.badRequest(undefined, 'Only pending requests can be rejected'),
      );
    });

    it('should throw error if rejection explanation is empty', async () => {
      const existingRequest = {
        id: 'request-1',
        state: RequestState.PENDING,
        document: {
          userId: 'admin-1',
        },
      };

      mockPrisma.researchRequest.findUnique = vi.fn().mockResolvedValue(existingRequest);

      await expect(service.rejectResearchRequest('request-1', '', mockAdminUser)).rejects.toThrow(
        HttpException.badRequest(undefined, 'Rejection explanation is required'),
      );

      await expect(
        service.rejectResearchRequest('request-1', '   ', mockAdminUser),
      ).rejects.toThrow(HttpException.badRequest(undefined, 'Rejection explanation is required'));
    });
  });
});
