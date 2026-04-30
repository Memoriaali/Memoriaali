'use client';
import {
  getApiV2MetadatasuggestionsDocumentByDocumentId,
  getApiV2MetadatasuggestionsPending,
  postApiV2Metadatasuggestions,
  postApiV2MetadatasuggestionsByIdApprove,
  postApiV2MetadatasuggestionsByIdReject,
  PostApiV2MetadatasuggestionsData,
} from '@/lib/api';
import { useCallback } from 'react';

export const useMetadatasuggestions = () => {
  const createMetadatasuggestion = useCallback(
    async (suggestionData: PostApiV2MetadatasuggestionsData['body']) => {
      try {
        const result = await postApiV2Metadatasuggestions({
          body: suggestionData,
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

  const getAllPendingSuggestions = useCallback(async () => {
    try {
      const result = await getApiV2MetadatasuggestionsPending();

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

  const approveUsersSuggestion = useCallback(async (suggestionId: string) => {
    try {
      const result = await postApiV2MetadatasuggestionsByIdApprove({
        path: {
          id: suggestionId,
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

  const rejectUsersSuggestion = useCallback(
    async (suggestionId: string, rejectionExplanation: string) => {
      try {
        const result = await postApiV2MetadatasuggestionsByIdReject({
          path: {
            id: suggestionId,
          },
          body: {
            rejectionExplanation,
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

  const getApprovedSuggestionsForDocument = useCallback(async (documentId: string) => {
    try {
      const result = await getApiV2MetadatasuggestionsDocumentByDocumentId({
        path: {
          documentId,
        },
        query: {
          page: 1,
          limit: 100,
          state: 'APPROVED',
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

  return {
    createMetadatasuggestion,
    getAllPendingSuggestions,
    approveUsersSuggestion,
    rejectUsersSuggestion,
    getApprovedSuggestionsForDocument,
  };
};
