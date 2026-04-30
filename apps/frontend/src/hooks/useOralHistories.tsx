'use client';
import { createOralHistory, CreateOralHistoryData, ErrorResponse, getAccessToken } from '@/lib/api';
import { useCallback } from 'react';

export const useOralHistories = () => {
  const postOralHistory = useCallback(async (data: CreateOralHistoryData['body']) => {
    const token = getAccessToken();
    if (!token) throw { statusCode: 401 };

    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    try {
      const result = await createOralHistory({
        body: {
          fileName: data.fileName,
          person: data.person,
          reporter: data.reporter,
          event: data.event,
          description: data.description,
          language: data.language,
          questions: data.questions ?? [],
          keywords: data.keywords ?? [],
          shareToGroup: data.shareToGroup ?? undefined,
          groupToShare: data.groupToShare ?? undefined,
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

  return {
    postOralHistory,
  };
};
