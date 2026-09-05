import { User } from '@shared/schema';

export interface AuthResponse {
  user: User;
}

export function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const entry = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(prefix));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(prefix.length));
  } catch {
    return null;
  }
}

export function getCsrfHeaders(): Record<string, string> {
  const token = getCookieValue('csrf_token');
  return token ? { 'X-CSRF-Token': token } : {};
}

// Kept as a compatibility helper for callers that used the old name. It no
// longer returns an account credential.
export function getAuthHeaders(): Record<string, string> {
  return getCsrfHeaders();
}

export function removeAuthToken(): void {
  // Expire credentials left by a previous client version. The active session
  // is HttpOnly and can only be cleared by the server logout endpoint.
  try {
    localStorage.removeItem('token');
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function setAuthToken(_token: string): void {
  // Do not reintroduce account tokens into browser-readable storage.
  removeAuthToken();
}
