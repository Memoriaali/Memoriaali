import type { Response } from 'express';

import type { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';

import {
  CreateResearchRequestSchema,
  ResearchRequestQuerySchema,
  UpdateResearchRequestSchema,
} from './researchrequests.schemas';
import type { ResearchRequestsService } from './researchrequests.service';

/**
 * Research Requests Controller
 *
 * Handles HTTP requests for research request management operations.
 * Validates input data and delegates business logic to the service layer.
 */
export class ResearchRequestsController {
  constructor(private readonly researchRequestsService: ResearchRequestsService) {}

  /**
   * Create a new research request
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  createResearchRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = CreateResearchRequestSchema.parse(req.body);
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const researchRequest = await this.researchRequestsService.createResearchRequest(
      input,
      currentUser,
    );

    res.status(201).json({
      status: 'success',
      data: researchRequest,
      message: 'Research request created successfully',
    });
  };

  /**
   * Get a research request by ID
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getResearchRequestById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        message: 'Research request ID is required',
      });
      return;
    }

    const researchRequest = await this.researchRequestsService.getResearchRequestById(
      id,
      currentUser,
    );

    res.json({
      status: 'success',
      data: researchRequest,
    });
  };

  /**
   * Update a research request
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  updateResearchRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const input = UpdateResearchRequestSchema.parse(req.body);
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
        message: 'Research request ID is required',
      });
      return;
    }

    const researchRequest = await this.researchRequestsService.updateResearchRequest(
      id,
      input,
      currentUser,
    );

    res.json({
      status: 'success',
      data: researchRequest,
      message: 'Research request updated successfully',
    });
  };

  /**
   * Approve a research request
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  approveResearchRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        message: 'Research request ID is required',
      });
      return;
    }

    const researchRequest = await this.researchRequestsService.approveResearchRequest(
      id,
      currentUser,
    );

    res.json({
      status: 'success',
      data: researchRequest,
      message: 'Research request approved successfully',
    });
  };

  /**
   * Reject a research request
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  rejectResearchRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { rejectionExplanation } = req.body as { rejectionExplanation?: string };
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
        message: 'Research request ID is required',
      });
      return;
    }

    if (
      !rejectionExplanation ||
      typeof rejectionExplanation !== 'string' ||
      rejectionExplanation.trim().length === 0
    ) {
      res.status(400).json({
        status: 'error',
        message: 'Rejection explanation is required',
      });
      return;
    }

    const researchRequest = await this.researchRequestsService.rejectResearchRequest(
      id,
      rejectionExplanation,
      currentUser,
    );

    res.json({
      status: 'success',
      data: researchRequest,
      message: 'Research request rejected successfully',
    });
  };

  /**
   * Get research requests with filtering and pagination
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getResearchRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const query = ResearchRequestQuerySchema.parse(req.query);
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const result = await this.researchRequestsService.getResearchRequests(query, currentUser);

    res.json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  };

  /**
   * Delete a research request
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  deleteResearchRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        message: 'Research request ID is required',
      });
      return;
    }

    await this.researchRequestsService.deleteResearchRequest(id, currentUser);

    res.json({
      status: 'success',
      message: 'Research request deleted successfully',
    });
  };
}
