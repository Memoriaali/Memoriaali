import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ERROR_CODES, HttpException } from '../../shared/errors';
import { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';
import {
  CreateDefaultQuestionInput,
  CreateDefaultQuestionInputSchema,
  ListDefaultQuestionsQuery,
  ListDefaultQuestionsQuerySchema,
  UpdateDefaultQuestionInput,
  UpdateDefaultQuestionInputSchema,
} from './defaultquestions.schemas';
import { DefaultQuestionsService } from './defaultquestions.service';

export class DefaultQuestionsController {
  constructor(private readonly defaultQuestionsService: DefaultQuestionsService) {}

  createDefaultQuestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }
    const questionData: CreateDefaultQuestionInput = CreateDefaultQuestionInputSchema.parse(
      req.body,
    );
    const newQuestion = await this.defaultQuestionsService.createDefaultQuestion(
      questionData,
      req.authenticatedUser.id,
    );

    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: newQuestion,
      message: 'Default question created successfully',
    });
  };

  getDefaultQuestionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }
    const { id } = req.params;
    if (!id) {
      throw HttpException.badRequest(
        ERROR_CODES.DEFAULT_QUESTIONS.INVALID_ID,
        'Question ID is required',
      );
    }
    const question = await this.defaultQuestionsService.getDefaultQuestionById(id);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: question,
      message: 'Default question retrieved successfully',
    });
  };

  listDefaultQuestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }
    const query: ListDefaultQuestionsQuery = ListDefaultQuestionsQuerySchema.parse(req.query);
    const result = await this.defaultQuestionsService.listDefaultQuestions(query);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: result,
      message: 'Default questions retrieved successfully',
    });
  };

  updateDefaultQuestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }
    const { id } = req.params;
    if (!id) {
      throw HttpException.badRequest(
        ERROR_CODES.DEFAULT_QUESTIONS.INVALID_ID,
        'Question ID is required',
      );
    }
    const questionData: UpdateDefaultQuestionInput = UpdateDefaultQuestionInputSchema.parse(
      req.body,
    );
    const updatedQuestion = await this.defaultQuestionsService.updateDefaultQuestion(
      id,
      questionData,
      req.authenticatedUser.id,
    );

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: updatedQuestion,
      message: 'Default question updated successfully',
    });
  };

  deleteDefaultQuestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }
    const { id } = req.params;
    if (!id) {
      throw HttpException.badRequest(
        ERROR_CODES.DEFAULT_QUESTIONS.INVALID_ID,
        'Question ID is required',
      );
    }
    await this.defaultQuestionsService.deleteDefaultQuestion(id);

    res.status(StatusCodes.NO_CONTENT).json({
      status: 'success',
      message: 'Default question deleted successfully',
    });
  };
}
