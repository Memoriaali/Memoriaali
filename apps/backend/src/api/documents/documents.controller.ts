import type { Response } from 'express';

import type { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';

import {
  CreateDocumentSchema,
  DocumentQuerySchema,
  UpdateDocumentSchema,
} from './documents.schemas';
import type { DocumentsService } from './documents.service';

/**
 * Documents Controller
 *
 * Handles HTTP requests for document management operations.
 * Validates input data and delegates business logic to the service layer.
 */
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Create a new document
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  createDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = CreateDocumentSchema.parse(req.body);
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const document = await this.documentsService.createDocument(input, currentUser);

    res.status(201).json({
      status: 'success',
      data: document,
      message: 'Document created successfully',
    });
  };

  /**
   * Get a document by ID
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getDocumentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (!id) {
      res.status(400).json({
        status: 'error',
        message: 'Document ID is required',
      });
      return;
    }

    const document = await this.documentsService.getDocumentById(id, currentUser);

    res.json({
      status: 'success',
      data: document,
    });
  };

  /**
   * Update a document
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  updateDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const input = UpdateDocumentSchema.parse(req.body);
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (!id) {
      res.status(400).json({
        status: 'error',
        message: 'Document ID is required',
      });
      return;
    }

    const document = await this.documentsService.updateDocument(id, input, currentUser);

    res.json({
      status: 'success',
      data: document,
      message: 'Document updated successfully',
    });
  };

  /**
   * Delete a document
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  deleteDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (!id) {
      res.status(400).json({
        status: 'error',
        message: 'Document ID is required',
      });
      return;
    }

    await this.documentsService.deleteDocument(id, currentUser);

    res.json({
      status: 'success',
      message: 'Document deleted successfully',
    });
  };

  /**
   * List documents with filtering and pagination
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  listDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const query = DocumentQuerySchema.parse(req.query);
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const result = await this.documentsService.listDocuments(query, currentUser);

    res.json({
      status: 'success',
      data: {
        documents: result.documents,
        pagination: result.pagination,
      },
    });
  };
}
