import type { Response } from 'express';

import type { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';

import {
  CreateOralHistorySchema,
  OralHistoryQuerySchema,
  UpdateOralHistorySchema,
} from './oralhistories.schemas';
import type { OralHistoriesService } from './oralhistories.service';

/**
 * Oral Histories Controller
 *
 * Handles HTTP requests for oral history management operations.
 * Validates input data and delegates business logic to the service layer.
 */
export class OralHistoriesController {
  constructor(private readonly oralHistoriesService: OralHistoriesService) {}

  /**
   * Create a new oral history
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  createOralHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = CreateOralHistorySchema.parse(req.body);
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const oralHistory = await this.oralHistoriesService.createOralHistory(input, currentUser);

    res.status(201).json({
      status: 'success',
      data: oralHistory,
      message: 'Oral history created successfully',
    });
  };

  /**
   * Get an oral history by ID
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getOralHistoryById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        message: 'Oral history ID is required',
      });
      return;
    }

    const oralHistory = await this.oralHistoriesService.getOralHistoryById(id, currentUser);

    res.json({
      status: 'success',
      data: oralHistory,
    });
  };

  /**
   * Update an oral history
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  updateOralHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const input = UpdateOralHistorySchema.parse(req.body);
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
        message: 'Oral history ID is required',
      });
      return;
    }

    const oralHistory = await this.oralHistoriesService.updateOralHistory(id, input, currentUser);

    res.json({
      status: 'success',
      data: oralHistory,
      message: 'Oral history updated successfully',
    });
  };

  /**
   * Delete an oral history
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  deleteOralHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        message: 'Oral history ID is required',
      });
      return;
    }

    await this.oralHistoriesService.deleteOralHistory(id, currentUser);

    res.json({
      status: 'success',
      message: 'Oral history deleted successfully',
    });
  };

  /**
   * List oral histories with filtering and pagination
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  listOralHistories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const query = OralHistoryQuerySchema.parse(req.query);
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const result = await this.oralHistoriesService.listOralHistories(query, currentUser);

    res.json({
      status: 'success',
      data: {
        oralHistories: result.data,
        pagination: result.pagination,
      },
    });
  };
}
