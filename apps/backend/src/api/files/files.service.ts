import * as fs from 'fs/promises';
import * as path from 'path';

import { PrismaClient, type DocPrivacy } from '@memoriaali/database';

import { HttpException } from '../../shared/errors';
import { AuthenticatedUser } from '../../shared/types/authenticated-user';

/**
 * File download service
 *
 * Handles file download business logic including:
 * - Document privacy validation
 * - File access control
 * - File streaming and delivery
 * - Error handling and security
 */
export class FilesService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get file stream for download if user has access
   *
   * Preconditions: documentId is a valid UUID, currentUser is authenticated
   * Postconditions: Returns file stream and metadata if access granted
   * Invariants: File path remains constant during operation
   */
  async getFileForDownload(
    documentId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ filePath: string; fileName: string; mimeType: string | null; fileSize: number }> {
    // Get document with privacy information
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        documentPrivacy: true,
        userId: true,
        groupToShare: true,
      },
    });

    if (!document) {
      throw HttpException.notFound(undefined, 'Document not found');
    }

    // Check if user can access this document
    if (!this.canAccessDocument(document, currentUser)) {
      throw HttpException.forbidden(undefined, 'Access denied to this document');
    }

    // Construct file path
    const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
    const filePath = path.join(uploadDir, document.fileName);
    const responseFilePath = filePath.split(path.sep).join('/');

    try {
      // Check if file exists and get file stats
      const fileStats = await fs.stat(filePath);

      if (!fileStats.isFile()) {
        throw HttpException.notFound(undefined, 'File not found');
      }

      return {
        filePath: responseFilePath,
        fileName: document.fileName,
        mimeType: document.mimeType,
        fileSize: fileStats.size,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // File system error
      throw HttpException.notFound(undefined, 'File not found or inaccessible');
    }
  }

  /**
   * Get document information for debugging (without file access)
   *
   * Preconditions: documentId is a valid UUID, currentUser is authenticated
   * Postconditions: Returns document metadata for access control debugging
   * Invariants: Document object is not mutated
   */
  async getDocumentInfo(
    documentId: string,
    _currentUser: AuthenticatedUser,
  ): Promise<{
    id: string;
    userId: string;
    documentPrivacy: DocPrivacy;
    groupToShare: string | null;
  }> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        documentPrivacy: true,
        userId: true,
        groupToShare: true,
      },
    });

    if (!document) {
      throw HttpException.notFound(undefined, 'Document not found');
    }

    return document;
  }

  /**
   * Check if user can access a document
   *
   * Access Control Rules:
   * 1. Admins and moderators can access ALL documents (full system access)
   * 2. For all users (including document owners), access depends on document privacy:
   *    - PUBLIC: Accessible to all authenticated users
   *    - PRIVATE: NOT accessible to anyone (including document owners)
   *    - GROUP: Currently restricted (TODO: implement group access logic)
   *    - RESEARCH_ONLY: Currently restricted (TODO: implement research request checking)
   *
   * Preconditions: document and currentUser are valid objects
   * Postconditions: Returns true if user has access, false otherwise
   * Invariants: Document and user objects are not mutated
   */
  public canAccessDocumentForDebug(
    document: { documentPrivacy: DocPrivacy; userId: string; groupToShare: string | null },
    currentUser: AuthenticatedUser,
  ): boolean {
    // Admin and moderators can access all documents
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') {
      return true;
    }

    // Document owner can always access their documents (except PRIVATE)
    if (document.userId === currentUser.id) {
      return document.documentPrivacy !== 'PRIVATE';
    }

    // Check privacy settings for all users
    switch (document.documentPrivacy) {
      case 'PUBLIC':
        return true;
      case 'PRIVATE':
        // PRIVATE documents cannot be downloaded by anyone (including document owners)
        return false;
      case 'GROUP':
        return (
          document.groupToShare !== null &&
          Array.isArray(currentUser.groupIds) &&
          currentUser.groupIds.includes(document.groupToShare)
        );
      case 'RESEARCH_ONLY':
        // TODO: Implement research request checking
        return false;
      default:
        return false;
    }
  }

  /**
   * Check if user can access a document (private method for production use)
   */
  private canAccessDocument(
    document: { documentPrivacy: DocPrivacy; userId: string; groupToShare: string | null },
    currentUser: AuthenticatedUser,
  ): boolean {
    return this.canAccessDocumentForDebug(document, currentUser);
  }
}
