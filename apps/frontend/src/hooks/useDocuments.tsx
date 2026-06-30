'use client';
import {
  createDocument,
  CreateDocumentData,
  deleteDocument,
  getAccessToken,
  getDocumentById,
  listDocuments,
  ListDocumentsData,
  postApiV2Uploads,
  updateDocument,
  UpdateDocumentData,
} from '@/lib/api';
import { useCallback } from 'react';
import { useAuth } from './useAuth';

export const useDocuments = () => {
  const { user } = useAuth();

  const createNewDocument = useCallback(async (documentData: CreateDocumentData['body']) => {
    try {
      const result = await createDocument({
        body: documentData,
      });

      const response = result.data?.data;
      if (!response) {
        throw new Error('No response from server');
      }
      return response;
    } catch {
      throw new Error('Unexpected error');
    }
  }, []);

  const uploadFile = async (file: File) => {
    try {
      const response = await postApiV2Uploads({
        body: {
          files: [file],
        },
      });

      if (!response) {
        throw new Error('No response from server');
      }

      return response.data?.data;
    } catch {
      throw new Error('Unexpected error');
    }
  };

  const getDocuments = useCallback(async (queryData: ListDocumentsData['query']) => {
    try {
      const result = await listDocuments({
        query: queryData,
      });

      if (!result) {
        throw new Error('No response from server');
      }

      return result;
    } catch {
      throw new Error('Unexpected error');
    }
  }, []);

  const getUsersDocuments = useCallback(
    async (page?: number) => {
      try {
        const result = await listDocuments({
          query: {
            page: page ?? 1,
            limit: 20,
            userId: user?.id,
          },
        });

        if (!result) {
          throw new Error('No response from server');
        }

        if (result.data?.status === 'error') {
          console.error(result.data?.status);
          throw new Error('Authentication required');
        }

        return result;
      } catch {
        throw new Error('Unexpected error');
      }
    },
    [user],
  );

  const getGroupDocuments = useCallback(async (groupId: string) => {
    try {
      const result = await listDocuments({
        query: {
          page: 1,
          limit: 20,
          groupId,
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

      return result;
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

  const getDocumentImage = useCallback(async (documentId: string) => {
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No access token found');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/files/${documentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error('Failed to fetch image');

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      throw new Error('Unexpected error');
    }
  }, []);

  const updateUsersDocument = useCallback(
    async (documentId: string, documentData: UpdateDocumentData['body']) => {
      try {
        const result = await updateDocument({
          path: {
            id: documentId,
          },
          body: documentData,
        });

        if (!result) {
          throw new Error('No response from server');
        }

        return result;
      } catch {
        throw new Error('Unexpected error');
      }
    },
    [],
  );

  const deleteFromDocuments = useCallback(async (documentId: string) => {
    try {
      const result = await deleteDocument({
        path: {
          id: documentId,
        },
      });

      if (!result) {
        throw new Error('No response from server');
      }

      return result;
    } catch {
      throw new Error('Unexpected error');
    }
  }, []);

  const getOneDocumentById = useCallback(async (documentId: string) => {
    try {
      const result = await getDocumentById({
        path: {
          id: documentId,
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

      return result;
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
    createNewDocument,
    uploadFile,
    getUsersDocuments,
    getGroupDocuments,
    getDocuments,
    getDocumentImage,
    deleteFromDocuments,
    updateUsersDocument,
    getOneDocumentById,
  };
};
