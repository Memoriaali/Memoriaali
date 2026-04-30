'use client';
import {
  deleteUser,
  ErrorResponse,
  getAccessToken,
  getUserById,
  listUsers,
  updateUser,
  UserRole,
} from '@/lib/api';
import { useCallback } from 'react';

export const useUsers = () => {
  const getUsers = useCallback(
    async (page?: number, PAGE_SIZE?: number, searchTerm?: string, role?: UserRole) => {
      const token = getAccessToken();
      if (searchTerm && !token) throw { statusCode: 401 };

      const headers = searchTerm && token ? { Authorization: `Bearer ${token}` } : undefined;

      try {
        const result = await listUsers({
          query: {
            page,
            limit: PAGE_SIZE,
            search: searchTerm?.trim() || undefined,
            role: role || undefined,
          },
          headers,
        });

        if (result.error || !result.data) {
          throw {
            statusCode: result.error.statusCode ?? 500,
          };
        }

        const users = result.data?.data;

        const total = result.data?.pagination?.totalCount;
        page = result.data?.pagination?.currentPage;
        const totalPages = result.data?.pagination?.totalPages;
        const hasNext = result.data?.pagination?.hasNextPage;
        const hasPrev = result.data?.pagination?.hasPreviousPage;

        return { users, total, page, totalPages, hasNext, hasPrev };
      } catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
          throw error as { statusCode: number };
        }
        throw { statusCode: 500 };
      }
    },
    [],
  );

  const searchFromUsers = useCallback(async (searchTerm: string) => {
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No access token found');

      const result = await listUsers({
        query: {
          search: searchTerm,
          page: 1,
          limit: 10,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.error || !result.data) {
        throw {
          statusCode: result.error.statusCode ?? 500,
        };
      }

      const user = result.data?.data;
      return user;
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error as { statusCode: number };
      }
      throw { statusCode: 500 };
    }
  }, []);

  const getUserByUserId = useCallback(async (userId: string) => {
    try {
      const result = await getUserById({
        path: {
          id: userId,
        },
      });

      if (result.error || !result.data) {
        throw {
          statusCode: result.error.statusCode ?? 500,
        };
      }

      const user = result.data?.data;
      return user;
    } catch {
      throw { statusCode: 500 };
    }
  }, []);

  const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw { statusCode: 401 };
      }

      const result = await updateUser({
        path: {
          id: userId,
        },
        body: {
          role: newRole,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.error || !result.data) {
        throw {
          statusCode: result.error.statusCode ?? 500,
          code: result.error.code ?? '',
        };
      }

      const user = result.data?.data;
      return user;
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error as { statusCode: number; code: string };
      }
      throw { statusCode: 500 };
    }
  }, []);

  const deleteUserByUserId = useCallback(async (userId: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw { statusCode: 401 };
      }

      const result = await deleteUser({
        path: {
          id: userId,
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
    getUsers,
    searchFromUsers,
    getUserByUserId,
    updateUserRole,
    deleteUserByUserId,
  };
};
