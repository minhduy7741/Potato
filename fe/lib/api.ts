/**
 * api.ts — Centralized fetch helper for all API calls.
 *
 * Automatically:
 *   - Prepends the backend base URL
 *   - Attaches the Authorization: Bearer <token> header from localStorage
 *   - Throws an error with the backend's message if the response is not OK
 */

export const WS_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
export const API_BASE = WS_BASE + '/api';
export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'potato.local';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('potato_token') || sessionStorage.getItem('potato_token');
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Lỗi kết nối đến server' }));
    const message = Array.isArray(errorData.message)
      ? errorData.message[0]
      : (errorData.message || `HTTP ${response.status}`);
    throw new Error(message);
  }

  // Handle 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
