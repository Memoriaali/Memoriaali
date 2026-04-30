'use client';
import {
  approveComment,
  createComment,
  CreateCommentData,
  deleteComment,
  getApiV2CommentsPending,
  listCommentsByDocument,
  rejectComment,
  updateComment,
} from '@/lib/api';
import { useCallback } from 'react';

export const useComments = () => {
  const createNewComment = useCallback(async (documentData: CreateCommentData['body']) => {
    try {
      const result = await createComment({
        body: documentData,
      });

      if (result?.response instanceof Response && !result.response.ok) {
        throw { statusCode: result.response.status };
      }

      if (result?.error) {
        throw {
          statusCode: result.response?.status ?? 500,
        };
      }

      return;
    } catch (err) {
      const statusCode =
        (err as { statusCode?: number; response?: { status?: number }; status?: number })
          ?.statusCode ??
        (err as { response?: { status?: number } })?.response?.status ??
        (err as { status?: number })?.status ??
        500;

      throw { statusCode };
    }
  }, []);

  const getAllPendingComments = useCallback(async () => {
    try {
      const result = await getApiV2CommentsPending();

      if (result?.response instanceof Response && !result.response.ok) {
        throw { statusCode: result.response.status };
      }

      if (result?.error) {
        throw {
          statusCode: result.response?.status ?? 500,
        };
      }

      return result?.data?.data;
    } catch (err) {
      const statusCode =
        (err as { statusCode?: number; response?: { status?: number }; status?: number })
          ?.statusCode ??
        (err as { response?: { status?: number } })?.response?.status ??
        (err as { status?: number })?.status ??
        500;

      throw { statusCode };
    }
  }, []);

  const approveUsersComment = useCallback(async (commentId: string) => {
    try {
      const result = await approveComment({
        path: {
          id: commentId,
        },
      });

      if (result?.response instanceof Response && !result.response.ok) {
        throw { statusCode: result.response.status };
      }

      if (result?.error) {
        throw {
          statusCode: result.response?.status ?? 500,
        };
      }

      return;
    } catch (err) {
      const statusCode =
        (err as { statusCode?: number; response?: { status?: number }; status?: number })
          ?.statusCode ??
        (err as { response?: { status?: number } })?.response?.status ??
        (err as { status?: number })?.status ??
        500;

      throw { statusCode };
    }
  }, []);

  const rejectUsersComment = useCallback(async (commentId: string) => {
    try {
      const result = await rejectComment({
        path: {
          id: commentId,
        },
      });

      if (result?.response instanceof Response && !result.response.ok) {
        throw { statusCode: result.response.status };
      }

      if (result?.error) {
        throw {
          statusCode: result.response?.status ?? 500,
        };
      }

      return;
    } catch (err) {
      const statusCode =
        (err as { statusCode?: number; response?: { status?: number }; status?: number })
          ?.statusCode ??
        (err as { response?: { status?: number } })?.response?.status ??
        (err as { status?: number })?.status ??
        500;

      throw { statusCode };
    }
  }, []);

  const getCommentByDocId = useCallback(async (documentId: string) => {
    try {
      const result = await listCommentsByDocument({
        path: {
          documentId,
        },
        query: {
          page: 1,
          limit: 10,
        },
      });

      if (result?.response instanceof Response && !result.response.ok) {
        throw { statusCode: result.response.status };
      }

      if (result?.error) {
        throw {
          statusCode: result.response?.status ?? 500,
        };
      }

      return result?.data?.data;
    } catch (err) {
      const statusCode =
        (err as { statusCode?: number; response?: { status?: number }; status?: number })
          ?.statusCode ??
        (err as { response?: { status?: number } })?.response?.status ??
        (err as { status?: number })?.status ??
        500;

      throw { statusCode };
    }
  }, []);

  const updateUsersComment = useCallback(
    async (commentId: string, comment: string, state: 'APPROVED' | 'PENDING' | 'REJECTED') => {
      try {
        const result = await updateComment({
          body: {
            comment,
            state,
          },
          path: {
            id: commentId,
          },
        });

        if (result?.response instanceof Response && !result.response.ok) {
          throw { statusCode: result.response.status };
        }

        if (result?.error) {
          throw {
            statusCode: result.response?.status ?? 500,
          };
        }

        return;
      } catch (err) {
        const statusCode =
          (err as { statusCode?: number; response?: { status?: number }; status?: number })
            ?.statusCode ??
          (err as { response?: { status?: number } })?.response?.status ??
          (err as { status?: number })?.status ??
          500;

        throw { statusCode };
      }
    },
    [],
  );

  const deleteUsersComment = useCallback(async (commentId: string) => {
    try {
      const result = await deleteComment({
        path: {
          id: commentId,
        },
      });

      if (result?.response instanceof Response && !result.response.ok) {
        throw { statusCode: result.response.status };
      }

      if (result?.error) {
        throw {
          statusCode: result.response?.status ?? 500,
        };
      }

      return;
    } catch (err) {
      const statusCode =
        (err as { statusCode?: number; response?: { status?: number }; status?: number })
          ?.statusCode ??
        (err as { response?: { status?: number } })?.response?.status ??
        (err as { status?: number })?.status ??
        500;

      throw { statusCode };
    }
  }, []);

  return {
    createNewComment,
    getAllPendingComments,
    approveUsersComment,
    rejectUsersComment,
    getCommentByDocId,
    updateUsersComment,
    deleteUsersComment,
  };
};
