import { User } from '@shared/schema';

export interface AuthResponse {
  user: User;
  token: string;
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function removeAuthToken(): void {
  localStorage.removeItem('token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('token', token);
}
