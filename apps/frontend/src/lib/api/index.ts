import { refreshToken as refreshTokenApi } from './generated';
import { client } from './generated/client.gen';

const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

client.setConfig({ baseUrl });

// In-memory JWT storage (app code can set/persist these as needed)
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Expose helpers for app authentication flows
export const setAuthTokens = (tokens: {
  accessToken: string;
  refreshToken?: string | null;
}): void => {
  accessToken = tokens.accessToken;
  if (typeof tokens.refreshToken !== 'undefined') {
    refreshToken = tokens.refreshToken;
  }
  client.setConfig({
    // Hey API will attach this as Bearer <token> for secured endpoints
    auth: () => accessToken ?? '',
  });
};

export const clearAuthTokens = (): void => {
  accessToken = null;
  refreshToken = null;
  client.setConfig({ auth: () => '' });
};

export const getAccessToken = (): string | null => accessToken;
export const getRefreshToken = (): string | null => refreshToken;

// Automatic refresh-on-401 with single-flight protection
let refreshInFlight: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshToken) {
    return null;
  }

  refreshInFlight ??= (async () => {
    try {
      const result = await refreshTokenApi<true>({
        body: { refreshToken },
        throwOnError: true,
      });
      const newToken = result.data?.data?.accessToken ?? null;
      if (newToken) {
        setAuthTokens({ accessToken: newToken });
        return newToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

// Mark retried requests to avoid infinite loops
const RETRY_HEADER = 'x-auth-retry';

client.interceptors.response.use(async (response, options) => {
  if (response.status !== 401) {
    return response;
  }
  const currentHeaders = new Headers(options.headers as HeadersInit);
  if (currentHeaders.get(RETRY_HEADER)) {
    return response;
  }

  const newToken = await refreshAccessToken();
  if (!newToken) {
    // Clear tokens on failed refresh so callers can react
    clearAuthTokens();
    return response;
  }

  // Retry original request with updated Authorization header
  const newHeaders = new Headers(options.headers as HeadersInit);
  newHeaders.set('Authorization', `Bearer ${newToken}`);
  newHeaders.set(RETRY_HEADER, '1');

  const url = (options as unknown as { url: string }).url;
  const maybeFetch = (options as unknown as { fetch?: typeof fetch }).fetch;
  const method = (options as unknown as { method?: string }).method;
  const body = (options as unknown as { serializedBody?: BodyInit }).serializedBody;

  const init: RequestInit = { headers: newHeaders, body: body ?? null };
  if (method) {
    init.method = method;
  }
  const retried = new Request(url, init);
  return (maybeFetch ?? fetch)(retried);
});

export * from './generated';

export { client };
