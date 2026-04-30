/**
 * Unit Tests for DocumentsInCollectionsController - Collection Document Listing
 *
 * ARCHITECTURAL CONTEXT:
 * Tests the controller layer for listing documents in collections by collection ID.
 * This controller handles HTTP request/response mapping, validation, and error handling
 * for the document-collection relationship management system.
 *
 * BUSINESS REQUIREMENTS:
 * - Users can view all documents in a collection they have access to
 * - Collection owners have full access to all documents in their collections
 * - Admin/moderator users have access to all collections
 * - Regular users can only see documents they have access to within the collection
 * - Results are paginated with configurable page size
 * - Proper authorization and access control is enforced
 *
 * KEY DEPENDENCIES:
 * - DocumentsInCollectionsService for business logic
 * - Authentication middleware for user context
 * - Zod validation for request/response schemas
 * - HTTP status code mapping from service exceptions
 *
 * SECURITY CONSIDERATIONS:
 * - Collection access control (owner, admin, moderator)
 * - Document-level access control (owner, public, group-shared)
 * - Proper error handling without information leakage
 *
 * CONTRACT SUMMARY:
 * - Preconditions: Valid collection ID, authenticated user with collection access
 * - Postconditions: Returns paginated list of accessible documents in collection
 * - Invariants: HTTP status codes match service responses, proper error handling
 */

import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { HttpException } from '../../../shared/errors';
import type { AuthenticatedRequest } from '../../../shared/types/AuthenticatedRequest';
import { AuthenticatedUser } from '../../../shared/types/authenticated-user';
import { DocumentsInCollectionsController } from '../documentsincollections.controller';
import { DocumentsInCollectionsService } from '../documentsincollections.service';

// Test fixture documentation: Representative entities for testing different scenarios
const testUsers = {
  // Regular user fixture - represents a typical authenticated user
  regularUser: new AuthenticatedUser(
    'user-123',
    'user@example.com',
    'Regular',
    'User',
    'USER',
    true,
    true,
  ),

  // Admin user fixture - represents a system administrator
  adminUser: new AuthenticatedUser(
    'admin-456',
    'admin@example.com',
    'Admin',
    'User',
    'ADMIN',
    true,
    true,
  ),

  // Collection owner fixture - represents a user who owns a collection
  collectionOwner: new AuthenticatedUser(
    'owner-789',
    'owner@example.com',
    'Owner',
    'User',
    'USER',
    true,
    true,
  ),
};

const testCollections = {
  // Public collection fixture - represents a typical collection
  publicCollection: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    collectionName: 'Test Collection',
    collectionDescription: 'A test collection for unit testing',
  },

  // Private collection fixture - represents a restricted collection
  privateCollection: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    collectionName: 'Private Collection',
    collectionDescription: 'A private collection for testing access control',
  },
};

const testDocuments = {
  // Public document fixture - represents a document accessible to all users
  publicDocument: {
    id: 1,
    fileName: 'public-doc.pdf',
    metadata: { title: 'Public Document' },
    documentPrivacy: 'PUBLIC',
    userId: 100,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    addedToCollectionAt: new Date('2024-01-20T14:00:00Z'),
    addedBy: 'user-123',
    user: {
      id: 'user-123',
      username: 'doc.owner',
      firstName: 'John',
      lastName: 'Doe',
    },
  },

  // Private document fixture - represents a document only accessible to owner
  privateDocument: {
    id: 2,
    fileName: 'private-doc.pdf',
    metadata: { title: 'Private Document' },
    documentPrivacy: 'PRIVATE',
    userId: 200,
    createdAt: new Date('2024-01-16T10:00:00Z'),
    updatedAt: new Date('2024-01-16T10:00:00Z'),
    addedToCollectionAt: new Date('2024-01-21T14:00:00Z'),
    addedBy: 'user-456',
    user: {
      id: 'user-456',
      username: 'private.owner',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  },
};

describe('DocumentsInCollectionsController - getDocumentsInCollection', () => {
  let controller: DocumentsInCollectionsController;
  let mockService: { getDocumentsInCollection: Mock };
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: Mock;
  let mockStatus: Mock;

  beforeEach(() => {
    // Setup mocks
    mockService = {
      getDocumentsInCollection: vi.fn(),
    };

    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    controller = new DocumentsInCollectionsController(
      mockService as unknown as DocumentsInCollectionsService,
    );
  });

  describe('successful requests', () => {
    /**
     * Scenario: Admin user successfully retrieves documents in a collection
     * Expected outcome: Returns 200 status with collection info, documents, and pagination
     * Contract: Postcondition (HTTP 200 response with complete data structure)
     * Business impact: Admin can view all documents in any collection for oversight
     */
    it('returns documents in collection for admin user', async () => {
      // Arrange
      const expectedResponse = {
        collection: testCollections.publicCollection,
        documents: [testDocuments.publicDocument, testDocuments.privateDocument],
        pagination: {
          page: 1,
          limit: 20,
          totalCount: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockService.getDocumentsInCollection.mockResolvedValue(expectedResponse);

      mockRequest = {
        params: { collectionId: '550e8400-e29b-41d4-a716-446655440001' },
        query: { page: '1', limit: '20' } as any,
        authenticatedUser: testUsers.adminUser,
      };

      // Act
      await controller.getDocumentsInCollection(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockService.getDocumentsInCollection).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        testUsers.adminUser,
        1,
        20,
      );
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockJson).toHaveBeenCalledWith(expectedResponse);
    });

    /**
     * Scenario: Collection owner successfully retrieves documents in their collection
     * Expected outcome: Returns 200 status with collection info and accessible documents
     * Contract: Postcondition (HTTP 200 response with owner's documents)
     * Business impact: Collection owners can manage and view their collection contents
     */
    it('returns documents in collection for collection owner', async () => {
      // Arrange
      const expectedResponse = {
        collection: testCollections.privateCollection,
        documents: [testDocuments.publicDocument],
        pagination: {
          page: 1,
          limit: 10,
          totalCount: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockService.getDocumentsInCollection.mockResolvedValue(expectedResponse);

      mockRequest = {
        params: { collectionId: '550e8400-e29b-41d4-a716-446655440002' },
        query: { page: '1', limit: '10' } as any,
        authenticatedUser: testUsers.collectionOwner,
      };

      // Act
      await controller.getDocumentsInCollection(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockService.getDocumentsInCollection).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440002',
        testUsers.collectionOwner,
        1,
        10,
      );
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockJson).toHaveBeenCalledWith(expectedResponse);
    });
  });

  describe('error handling', () => {
    /**
     * Scenario: Collection not found
     * Expected outcome: Returns 404 status with appropriate error message
     * Contract: Precondition (collection must exist)
     * Business impact: API returns proper 404 response, client can handle gracefully
     */
    it('handles collection not found error', async () => {
      // Arrange
      const notFoundError = HttpException.notFound('COLLECTION_NOT_FOUND', 'Collection not found');
      mockService.getDocumentsInCollection.mockRejectedValue(notFoundError);

      mockRequest = {
        params: { collectionId: 'non-existent' },
        query: { page: '1', limit: '20' } as any,
        authenticatedUser: testUsers.regularUser,
      };

      // Act
      await controller.getDocumentsInCollection(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith(notFoundError.toJSON());
    });

    /**
     * Scenario: Access denied to collection
     * Expected outcome: Returns 403 status with access denied message
     * Contract: Precondition (user must have access to collection)
     * Business impact: Proper access control enforcement, no information leakage
     */
    it('handles access denied error', async () => {
      // Arrange
      const accessDeniedError = HttpException.forbidden(
        'ACCESS_DENIED',
        'Access denied to collection',
      );
      mockService.getDocumentsInCollection.mockRejectedValue(accessDeniedError);

      mockRequest = {
        params: { collectionId: 'col-456' },
        query: { page: '1', limit: '20' } as any,
        authenticatedUser: testUsers.regularUser,
      };

      // Act
      await controller.getDocumentsInCollection(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith(accessDeniedError.toJSON());
    });

    /**
     * Scenario: Invalid query parameters
     * Expected outcome: Returns 400 status with validation error details
     * Contract: Precondition (valid query parameters)
     * Business impact: Client receives clear feedback about invalid input
     */
    it('handles validation errors', async () => {
      // Arrange
      const validationError = new Error('ZodError');
      validationError.name = 'ZodError';
      validationError.message = 'Invalid query parameters';

      mockRequest = {
        params: { collectionId: 'invalid-uuid' },
        query: { page: 'invalid', limit: 'invalid' } as any,
        authenticatedUser: testUsers.regularUser,
      };

      // Act
      await controller.getDocumentsInCollection(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid request data',
        code: 'VALIDATION_FAILED',
        details: expect.any(String),
      });
    });

    /**
     * Scenario: Authentication required but not provided
     * Expected outcome: Returns 401 status with authentication required message
     * Contract: Precondition (user must be authenticated)
     * Business impact: Proper authentication enforcement
     */
    it('handles missing authentication', async () => {
      // Arrange
      mockRequest = {
        params: { collectionId: 'col-123' },
        query: { page: '1', limit: '20' } as any,
        authenticatedUser: undefined as unknown as AuthenticatedUser,
      };

      // Act
      await controller.getDocumentsInCollection(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
    });

    /**
     * Scenario: Unexpected service error
     * Expected outcome: Returns 500 status with internal server error
     * Contract: Invariant (proper error handling for unexpected errors)
     * Business impact: System maintains stability, no sensitive information leaked
     */
    it('handles unexpected errors', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      mockService.getDocumentsInCollection.mockRejectedValue(unexpectedError);

      mockRequest = {
        params: { collectionId: 'col-123' },
        query: { page: '1', limit: '20' } as any,
        authenticatedUser: testUsers.regularUser,
      };

      // Act
      await controller.getDocumentsInCollection(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('parameter handling', () => {
    /**
     * Scenario: Default pagination parameters
     * Expected outcome: Uses default page=1 and limit=20 when not provided
     * Contract: Precondition (valid pagination parameters with defaults)
     * Business impact: API is user-friendly with sensible defaults
     */
    it('uses default pagination parameters when not provided', async () => {
      // Arrange
      const expectedResponse = {
        collection: testCollections.publicCollection,
        documents: [],
        pagination: {
          page: 1,
          limit: 20,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockService.getDocumentsInCollection.mockResolvedValue(expectedResponse);

      mockRequest = {
        params: { collectionId: 'col-123' },
        query: {} as any, // No pagination parameters
        authenticatedUser: testUsers.regularUser,
      };

      // Act
      await controller.getDocumentsInCollection(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockService.getDocumentsInCollection).toHaveBeenCalledWith(
        'col-123',
        testUsers.regularUser,
        1, // Default page
        20, // Default limit
      );
    });

    /**
     * Scenario: Custom pagination parameters
     * Expected outcome: Uses provided page and limit values
     * Contract: Precondition (valid pagination parameters)
     * Business impact: Clients can control result size and navigation
     */
    it('uses custom pagination parameters when provided', async () => {
      // Arrange
      const expectedResponse = {
        collection: testCollections.publicCollection,
        documents: [],
        pagination: {
          page: 3,
          limit: 5,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      };

      mockService.getDocumentsInCollection.mockResolvedValue(expectedResponse);

      mockRequest = {
        params: { collectionId: 'col-123' },
        query: { page: '3', limit: '5' } as any,
        authenticatedUser: testUsers.regularUser,
      };

      // Act
      await controller.getDocumentsInCollection(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockService.getDocumentsInCollection).toHaveBeenCalledWith(
        'col-123',
        testUsers.regularUser,
        3, // Custom page
        5, // Custom limit
      );
    });
  });
});
