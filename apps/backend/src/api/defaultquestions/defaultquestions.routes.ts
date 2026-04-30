import { RequestHandler, Router } from 'express';
import { authenticateUser } from '../../middleware/authentication.middleware';
import { prisma } from '../../shared/database/prisma';
import { asyncHandler } from '../../shared/utils/response.utils';
import { DefaultQuestionsController } from './defaultquestions.controller';
import { DefaultQuestionsService } from './defaultquestions.service';

export const createDefaultQuestionRoutes = (): Router => {
  const router = Router();

  const defaultQuestionsService = new DefaultQuestionsService(prisma);
  const defaultQuestionsController = new DefaultQuestionsController(defaultQuestionsService);

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @swagger
   * /api/v2/defaultquestions:
   *   post:
   *     summary: Create new default question
   *     description: |
   *       Creates a new default question for the system.
   *       Default questions are predefined questions that can be used across the platform.
   *
   *       **Required Permission**: `defaultquestions:create`
   *
   *       The endpoint validates:
   *       - Question text (required, max 2000 characters)
   *       - Sort index (required, 1-9999, must be unique)
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Default Questions
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - text
   *               - sortIndex
   *             properties:
   *               text:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 2000
   *                 description: Question text content
   *               sortIndex:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 9999
   *                 description: Display order for the question
   *     responses:
   *       201:
   *         description: Default question created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/DefaultQuestion'
   *                 message:
   *                   type: string
   *                   example: Default question created successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       409:
   *         description: Sort index already exists
   *       500:
   *         description: Internal server error
   */
  router.post('/', asyncHandler(defaultQuestionsController.createDefaultQuestion));

  /**
   * @swagger
   * /api/v2/defaultquestions:
   *   get:
   *     summary: List default questions
   *     description: |
   *       Retrieves a paginated list of default questions.
   *       Supports pagination, sorting, and search functionality.
   *
   *       **Required Permission**: `defaultquestions:read`
   *
   *       Features:
   *       - Pagination with configurable page size
   *       - Sorting by sortIndex, createdAt, or updatedAt
   *       - Search by question text
   *       - Role-based response filtering
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Default Questions
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of items per page
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [sortIndex, createdAt, updatedAt]
   *           default: sortIndex
   *         description: Field to sort by
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: asc
   *         description: Sort order
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search term for question text
   *     responses:
   *       200:
   *         description: Default questions retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/DefaultQuestion'
   *                     total:
   *                       type: integer
   *                       description: Total number of questions
   *                     page:
   *                       type: integer
   *                       description: Current page number
   *                     limit:
   *                       type: integer
   *                       description: Items per page
   *                 message:
   *                   type: string
   *                   example: Default questions retrieved successfully
   *       400:
   *         description: Invalid query parameters
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Internal server error
   */
  router.get('/', asyncHandler(defaultQuestionsController.listDefaultQuestions));

  /**
   * @swagger
   * /api/v2/defaultquestions/{id}:
   *   get:
   *     summary: Get default question by ID
   *     description: |
   *       Retrieves a specific default question by its unique identifier.
   *       Response includes role-based data filtering based on user permissions.
   *
   *       **Required Permission**: `defaultquestions:read`
   *
   *       Response varies by user role:
   *       - **Public**: Basic question data (id, text, sortIndex)
   *       - **Owner/Moderator/Expert**: Includes audit fields (createdAt, updatedAt)
   *       - **Admin**: Full data including user IDs
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Default Questions
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Unique identifier of the default question
   *     responses:
   *       200:
   *         description: Default question retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/DefaultQuestion'
   *                 message:
   *                   type: string
   *                   example: Default question retrieved successfully
   *       400:
   *         description: Invalid question ID
   *       401:
   *         description: Authentication required
   *       404:
   *         description: Default question not found
   *       500:
   *         description: Internal server error
   */
  router.get('/:id', asyncHandler(defaultQuestionsController.getDefaultQuestionById));

  /**
   * @swagger
   * /api/v2/defaultquestions/{id}:
   *   put:
   *     summary: Update default question
   *     description: |
   *       Updates an existing default question.
   *       Only the creator or users with appropriate permissions can modify questions.
   *
   *       **Required Permission**: `defaultquestions:update`
   *
   *       The endpoint validates:
   *       - Question text (if provided, max 2000 characters)
   *       - Sort index (if provided, 1-9999, must be unique)
   *       - User permissions to modify the question
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Default Questions
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Unique identifier of the default question to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               text:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 2000
   *                 description: Updated question text content
   *               sortIndex:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 9999
   *                 description: Updated display order for the question
   *     responses:
   *       200:
   *         description: Default question updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/DefaultQuestion'
   *                 message:
   *                   type: string
   *                   example: Default question updated successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions to update this question
   *       404:
   *         description: Default question not found
   *       409:
   *         description: Sort index already exists
   *       500:
   *         description: Internal server error
   */
  router.put('/:id', asyncHandler(defaultQuestionsController.updateDefaultQuestion));

  /**
   * @swagger
   * /api/v2/defaultquestions/{id}:
   *   delete:
   *     summary: Delete default question
   *     description: |
   *       Permanently removes a default question from the system.
   *       This action cannot be undone.
   *
   *       **Required Permission**: `defaultquestions:delete`
   *
   *       The endpoint validates:
   *       - Question exists
   *       - User has permission to delete the question
   *       - No dependencies prevent deletion
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Default Questions
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Unique identifier of the default question to delete
   *     responses:
   *       204:
   *         description: Default question deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: Default question deleted successfully
   *       400:
   *         description: Invalid question ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions to delete this question
   *       404:
   *         description: Default question not found
   *       409:
   *         description: Cannot delete question due to dependencies
   *       500:
   *         description: Internal server error
   */
  router.delete('/:id', asyncHandler(defaultQuestionsController.deleteDefaultQuestion));

  return router;
};
