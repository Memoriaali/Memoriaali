'use client';
import {
  deleteApiV2DefaultquestionsById,
  ErrorResponse,
  getAccessToken,
  getApiV2Defaultquestions,
  postApiV2Defaultquestions as postDefaultQuestion,
  putApiV2DefaultquestionsById,
} from '@/lib/api';
import { useCallback } from 'react';

export const useDefaultQuestions = () => {
  const createDefaultQuestion = useCallback(async (text: string, sortIndex: number) => {
    const token = getAccessToken();
    if (!token) throw { statusCode: 401 };

    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    try {
      const result = await postDefaultQuestion({
        body: {
          text,
          sortIndex,
        },
        headers,
      });

      if (result.error || !result.data) {
        throw {
          statusCode: (result.error as ErrorResponse).statusCode ?? 500,
        };
      }

      const res = result.data?.data;

      return res;
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error as { statusCode: number };
      }
      throw { statusCode: 500 };
    }
  }, []);

  const fetchDefaultQuestions = useCallback(
    async (
      page?: number,
      limit?: number,
      sortBy?: string,
      sortOrder?: string,
      searchTerm?: string,
    ) => {
      const token = getAccessToken();
      if (!token) throw { statusCode: 401 };

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      try {
        const result = await getApiV2Defaultquestions({
          query: {
            page: 1,
            limit: 100,
            sortBy: 'sortIndex',
            sortOrder: 'asc',
            search: searchTerm?.trim() || undefined,
          },
          headers,
        });

        if (result.error || !result.data) {
          throw {
            statusCode: (result.error as ErrorResponse).statusCode ?? 500,
          };
        }

        const res = result.data?.data?.data;

        return res;
      } catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
          throw error as { statusCode: number };
        }
        throw { statusCode: 500 };
      }
    },
    [],
  );

  const updateDefaultQuestionById = useCallback(
    async (id: string, text: string, sortIndex: number) => {
      const token = getAccessToken();
      if (!token) throw { statusCode: 401 };

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      try {
        const result = await putApiV2DefaultquestionsById({
          path: {
            id,
          },
          body: {
            text,
            sortIndex,
          },
          headers,
        });

        if (result.error || !result.data) {
          throw {
            statusCode: (result.error as ErrorResponse).statusCode ?? 500,
          };
        }

        const res = result.data?.data;

        return res;
      } catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
          throw error as { statusCode: number };
        }
        throw { statusCode: 500 };
      }
    },
    [],
  );

  const deleteDefaultQuestionById = useCallback(async (questionId: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw { statusCode: 401 };
      }

      const result = await deleteApiV2DefaultquestionsById({
        path: {
          id: questionId,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.error || !result.data) {
        if (typeof result.error === 'string') {
          throw {
            statusCode: 400,
          };
        } else if (typeof result.error === 'object') {
          throw {
            statusCode: (result.error as ErrorResponse).statusCode ?? 500,
          };
        } else {
          throw {
            statusCode: 500,
          };
        }
      }
      return result.data;
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error as { statusCode: number };
      }
      throw { statusCode: 500 };
    }
  }, []);

  return {
    createDefaultQuestion,
    fetchDefaultQuestions,
    updateDefaultQuestionById,
    deleteDefaultQuestionById,
  };
};
