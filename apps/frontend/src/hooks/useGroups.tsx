'use client';
import {
  addUserToGroup,
  createGroup,
  CreateGroupData,
  deleteGroup,
  listGroups,
  listGroupsForUser,
  listUsersInGroup,
  removeUserFromGroup,
  updateGroup,
  UpdateGroupData,
} from '@/lib/api';
import { useCallback } from 'react';

export const useGroups = () => {
  const createNewGroup = useCallback(async (groupData: CreateGroupData['body']) => {
    try {
      const result = await createGroup({
        body: groupData,
      });

      const response = result.data?.data;

      if (result?.response instanceof Response && !result.response.ok) {
        throw { statusCode: result.response.status };
      }

      if (result?.error) {
        throw {
          statusCode: result.response?.status ?? 500,
        };
      }

      return response;
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

  const getAllGroups = useCallback(async () => {
    try {
      const result = await listGroups({
        query: {
          page: 1,
          limit: 100,
        },
      });

      const response = result.data?.data;

      if (result?.response instanceof Response && !result.response.ok) {
        throw { statusCode: result.response.status };
      }

      if (result?.error) {
        throw {
          statusCode: result.response?.status ?? 500,
        };
      }

      return response;
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

  const deleteCurrentGroup = useCallback(async (groupId: string) => {
    try {
      const result = await deleteGroup({
        path: {
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

  const updateCurrentGroup = useCallback(
    async (groupId: string, groupData: UpdateGroupData['body']) => {
      try {
        const result = await updateGroup({
          path: {
            groupId,
          },
          body: groupData,
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
    },
    [],
  );

  const addNewMemberToGroup = useCallback(async (groupId: string, userId: string) => {
    try {
      const result = await addUserToGroup({
        body: {
          groupId,
          userId,
          metadata: undefined,
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

  const getMembersInGroup = useCallback(async (groupId: string) => {
    try {
      const result = await listUsersInGroup({
        path: {
          groupId,
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

      const response = result.data?.data?.items;

      return response;
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

  const deleteUserFromGroup = useCallback(async (groupId: string, userId: string) => {
    try {
      const result = await removeUserFromGroup({
        body: {
          groupId,
          userId,
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

  const getAllGroupsForUser = useCallback(async (userId: string) => {
    try {
      const result = await listGroupsForUser({
        path: {
          userId,
        },
        query: {
          page: 1,
          limit: 100,
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

      return result.data?.data?.items;
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
    createNewGroup,
    getAllGroups,
    deleteCurrentGroup,
    updateCurrentGroup,
    addNewMemberToGroup,
    getMembersInGroup,
    deleteUserFromGroup,
    getAllGroupsForUser,
  };
};
