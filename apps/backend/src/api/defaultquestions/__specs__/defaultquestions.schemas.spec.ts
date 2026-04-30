import { describe, it, expect } from 'vitest';
import {
  CreateDefaultQuestionInputSchema,
  UpdateDefaultQuestionInputSchema,
  ListDefaultQuestionsQuerySchema,
} from '../defaultquestions.schemas';

describe('DefaultQuestions Schemas', () => {
  describe('CreateDefaultQuestionInputSchema', () => {
    it('should validate valid create input', () => {
      const validInput = {
        text: 'What was your childhood like?',
        sortIndex: 1,
      };

      const result = CreateDefaultQuestionInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input without required fields', () => {
      const invalidInput = {
        text: 'What was your childhood like?',
        // Missing sortIndex
      };

      const result = CreateDefaultQuestionInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateDefaultQuestionInputSchema', () => {
    it('should validate valid update input', () => {
      const validInput = {
        text: 'Updated question text',
        sortIndex: 2,
      };

      const result = UpdateDefaultQuestionInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const partialInput = {
        text: 'Only updating text',
      };

      const result = UpdateDefaultQuestionInputSchema.safeParse(partialInput);
      expect(result.success).toBe(true);
    });
  });

  describe('ListDefaultQuestionsQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validQuery = {
        page: 2,
        limit: 50,
        search: 'childhood',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = ListDefaultQuestionsQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const emptyQuery = {};

      const result = ListDefaultQuestionsQuerySchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });
  });
});
