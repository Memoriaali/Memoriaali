import { type PrismaClient } from '@memoriaali/database';
import { ERROR_CODES, HttpException } from '../../shared/errors';
import {
  CreateDefaultQuestionInput,
  ListDefaultQuestionsQuery,
  UpdateDefaultQuestionInput,
} from './defaultquestions.schemas';

export class DefaultQuestionsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Creates a new default question
   *
   * @param input - Question data including text and sortIndex
   * @param userId - ID of the user creating the question
   * @returns Created question with generated UUID and audit fields
   */
  async createDefaultQuestion(input: CreateDefaultQuestionInput, userId: string) {
    try {
      // Check if sortIndex already exists
      const existingQuestion = await this.prisma.defaultQuestion.findFirst({
        where: { sortIndex: input.sortIndex },
      });

      if (existingQuestion) {
        throw HttpException.conflict(
          ERROR_CODES.DEFAULT_QUESTIONS.SORT_INDEX_CONFLICT,
          `Sort index ${input.sortIndex} already exists`,
        );
      }

      // Create the question with audit fields
      const question = await this.prisma.defaultQuestion.create({
        data: {
          text: input.text,
          sortIndex: input.sortIndex,
          createdById: userId,
          updatedById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });

      return question;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle Prisma errors
      if (error instanceof Error) {
        throw HttpException.internalServerError(
          ERROR_CODES.SYSTEM.DATABASE_ERROR,
          `Failed to create default question: ${error.message}`,
        );
      }

      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.DATABASE_ERROR,
        'Failed to create default question',
      );
    }
  }

  /**
   * Retrieves a default question by ID
   *
   * @param id - UUID of the question
   * @returns Question data or null if not found
   */
  async getDefaultQuestionById(id: string) {
    try {
      const question = await this.prisma.defaultQuestion.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });

      if (!question) {
        throw HttpException.notFound(
          ERROR_CODES.DEFAULT_QUESTIONS.NOT_FOUND,
          `Default question with ID ${id} not found`,
        );
      }

      return question;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.DATABASE_ERROR,
        'Failed to retrieve default question',
      );
    }
  }

  /**
   * Lists default questions with pagination, sorting, and search
   *
   * @param query - Query parameters for pagination, sorting, and search
   * @returns Paginated list of questions
   */
  async listDefaultQuestions(query: ListDefaultQuestionsQuery) {
    try {
      const { page, limit, sortBy, sortOrder, search } = query;
      const skip = (page - 1) * limit;

      // Build where clause for search
      const where = search
        ? {
            text: {
              contains: search,
              mode: 'insensitive' as const,
            },
          }
        : {};

      // Get total count for pagination
      const total = await this.prisma.defaultQuestion.count({ where });

      // Get questions with pagination and sorting
      const questions = await this.prisma.defaultQuestion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });

      return {
        data: questions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch {
      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.DATABASE_ERROR,
        'Failed to list default questions',
      );
    }
  }

  /**
   * Updates an existing default question
   *
   * @param id - UUID of the question to update
   * @param input - Updated question data
   * @param userId - ID of the user updating the question
   * @returns Updated question data
   */
  async updateDefaultQuestion(id: string, input: UpdateDefaultQuestionInput, userId: string) {
    try {
      // Check if question exists
      const existingQuestion = await this.prisma.defaultQuestion.findUnique({
        where: { id },
      });

      if (!existingQuestion) {
        throw HttpException.notFound(
          ERROR_CODES.DEFAULT_QUESTIONS.NOT_FOUND,
          `Default question with ID ${id} not found`,
        );
      }

      // If updating sortIndex, check for conflicts
      if (input.sortIndex !== undefined && input.sortIndex !== existingQuestion.sortIndex) {
        const conflictingQuestion = await this.prisma.defaultQuestion.findFirst({
          where: {
            sortIndex: input.sortIndex,
            id: { not: id }, // Exclude current question
          },
        });

        if (conflictingQuestion) {
          throw HttpException.conflict(
            ERROR_CODES.DEFAULT_QUESTIONS.SORT_INDEX_CONFLICT,
            `Sort index ${input.sortIndex} already exists`,
          );
        }
      }

      // Update the question
      const updatedQuestion = await this.prisma.defaultQuestion.update({
        where: { id },
        data: {
          ...(input.text !== undefined && { text: input.text }),
          ...(input.sortIndex !== undefined && { sortIndex: input.sortIndex }),
          updatedById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });

      return updatedQuestion;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.DATABASE_ERROR,
        'Failed to update default question',
      );
    }
  }

  /**
   * Deletes a default question
   *
   * @param id - UUID of the question to delete
   * @returns Success status
   */
  async deleteDefaultQuestion(id: string) {
    try {
      // Check if question exists
      const existingQuestion = await this.prisma.defaultQuestion.findUnique({
        where: { id },
      });

      if (!existingQuestion) {
        throw HttpException.notFound(
          ERROR_CODES.DEFAULT_QUESTIONS.NOT_FOUND,
          `Default question with ID ${id} not found`,
        );
      }

      // Delete the question
      await this.prisma.defaultQuestion.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.DATABASE_ERROR,
        'Failed to delete default question',
      );
    }
  }
}
