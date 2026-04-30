'use client';

import {
  activateAccount,
  changeUserPassword,
  ChangeUserPasswordData,
  clearAuthTokens,
  forgotPassword,
  getAccessToken,
  getOwnProfile,
  login,
  logout,
  register,
  RegisterData,
  resetPassword,
  setAuthTokens,
  updateOwnProfile,
  UpdateOwnProfileData,
  User,
  ValidationErrorResponse,
} from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (_identifier: string, _password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerUser: (_userData: RegisterData['body']) => Promise<unknown>;
  refreshUser: () => Promise<void>;
  activateUserAccount: (_email: string, _verificationCode: string) => Promise<unknown>;
  fetchMe: () => Promise<void>;
  updateCurrentUser: (_updateUserData: UpdateOwnProfileData['body']) => Promise<unknown>;
  updateUserPassword: (_updatePasswordData: ChangeUserPasswordData['body']) => Promise<void>;
  sendPasswordResetEmail: (_email: string) => Promise<unknown>;
  resetUserPassword: (_token: string, _password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { locale } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await getOwnProfile();
      const currentUser = res?.data?.data;
      setUser(currentUser ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  const updateCurrentUser = useCallback(async (updateUserData: UpdateOwnProfileData['body']) => {
    try {
      const result = await updateOwnProfile({ body: updateUserData });

      if (result.error) {
        throw new Error(result.error.message ?? 'Update failed');
      }
      const updatedUser = result.data?.data;

      if (updatedUser) {
        setUser(updatedUser);
      } else {
        throw new Error('Failed to retrieve updated user info');
      }

      return updatedUser;
    } catch {
      throw new Error('Unexpected error');
    }
  }, []);

  const updateUserPassword = useCallback(
    async (updatePasswordData: ChangeUserPasswordData['body']) => {
      try {
        const user = await getOwnProfile();
        const userId = user.data?.data?.id;

        if (!userId) {
          throw new Error('User not found');
        }

        const result = await changeUserPassword({
          path: { id: userId } as ChangeUserPasswordData['path'],
          body: updatePasswordData,
        });

        if (result.error?.message === 'Validation failed') {
          const validationErr = result.error as ValidationErrorResponse;
          validationErr.errors.forEach((err) => {
            throw new Error(err.message);
          });
        }

        if (result.error) {
          throw new Error(result.error.message ?? 'Password update failed');
        }

        return;
      } catch {
        throw new Error('Unexpected error');
      }
    },
    [],
  );

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    try {
      const result = await forgotPassword({
        body: { email },
      });

      if (result.error) {
        throw new Error(result.error.message ?? 'Password reset request failed');
      }

      const response = result.data?.status;
      return response;
    } catch {
      throw new Error('Unexpected error');
    }
  }, []);

  const resetUserPassword = useCallback(async (token: string, password: string) => {
    try {
      const result = await resetPassword({
        body: { token, password },
      });

      if (result.error?.message === 'Validation failed') {
        const validationErr = result.error as ValidationErrorResponse;
        validationErr.errors.forEach((err) => {
          throw new Error(err.message);
        });
      }

      if (result.error) {
        throw new Error(result.error.message ?? 'Password reset failed');
      }
    } catch {
      throw new Error('Unexpected error');
    }
  }, []);

  const _login = useCallback(async (identifier: string, password: string) => {
    try {
      const result = await login({
        body: { identifier, password },
      });

      if (result.error || !result.data) {
        throw {
          statusCode: result.response.status,
        };
      }

      const response = result.data?.data;

      const accessToken = response.accessToken;
      const refreshToken = response.refreshToken ?? null;

      setAuthTokens({ accessToken, refreshToken });
      setUser((response.user as unknown as User) ?? null);
    } catch (error) {
      throw { statusCode: (error as { statusCode?: number })?.statusCode ?? 500 };
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const accessToken = getAccessToken();
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const _logout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      clearAuthTokens();
      setUser(null);
      router.push(`/${locale}`);
    }
  }, [locale, router]);

  const registerUser = useCallback(async (userData: RegisterData['body']): Promise<void> => {
    try {
      const result = await register({ body: userData });

      if (result?.response instanceof Response && !result.response.ok) {
        throw { statusCode: result.response.status };
      }

      if (result?.error) {
        throw {
          statusCode: result.response?.status ?? 500,
        };
      }

      return;
    } catch (err: unknown) {
      const statusCode =
        (err as { statusCode?: number; response?: { status?: number }; status?: number })
          ?.statusCode ??
        (err as { response?: { status?: number } })?.response?.status ??
        (err as { status?: number })?.status ??
        500;

      throw { statusCode };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  const activateUserAccount = useCallback(async (email: string, verificationCode: string) => {
    try {
      const result = await activateAccount({
        body: { email, verificationCode },
      });

      if (result.error) {
        throw new Error(result.error.message ?? 'Activation failed');
      }

      const response = result.data?.data;
      return response;
    } catch {
      throw new Error('Unexpected error');
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (getAccessToken()) {
          await fetchMe();
        }
      } finally {
        setIsLoading(false);
      }
    })().catch((error) => {
      console.error('Auth initialization error:', error);
    });
  }, [fetchMe]);

  const value: AuthContextValue = useMemo(
    () => ({
      isAuthenticated: !!user,
      isLoading,
      user,
      login: _login,
      logout: _logout,
      refreshUser,
      registerUser,
      activateUserAccount,
      fetchMe,
      updateCurrentUser,
      updateUserPassword,
      sendPasswordResetEmail,
      resetUserPassword,
    }),
    [
      user,
      isLoading,
      _login,
      _logout,
      refreshUser,
      registerUser,
      activateUserAccount,
      fetchMe,
      updateCurrentUser,
      updateUserPassword,
      sendPasswordResetEmail,
      resetUserPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      setAuthTokens({ accessToken, refreshToken: null });

      localStorage.removeItem('accessToken');
    }
  }, []);

  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
