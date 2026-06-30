'use client';
import {
  createSipPackage,
  CreateSipPackageData,
  streamSipProgress,
  StreamSipProgressData,
} from '@/lib/api';
import { useCallback } from 'react';

export const useSip = () => {
  const createNewSipPackage = useCallback(async (sipPackageData: CreateSipPackageData['body']) => {
    try {
      const result = await createSipPackage({
        body: sipPackageData,
      });
      const response = result.data;
      if (!response) {
        throw new Error('No response from server');
      }
      return response;
    } catch (error) {
      console.error('Error creating SIP package:', error);
      throw new Error('Failed to create SIP package');
    }
  }, []);

  const streamProgress = useCallback(async (streamSipData: StreamSipProgressData['path']) => {
    try {
      const result = await streamSipProgress({
        path: streamSipData,
      });
      const response = result.stream;
      if (!response) {
        throw new Error('No response from server');
      }
      return response;
    } catch (error) {
      console.error('Error in streaming SIP data', error);
      throw new Error('Failed to stream SIP data');
    }
  }, []);

  return {
    createNewSipPackage,
    streamProgress,
  };
};
