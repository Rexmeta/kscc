import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import type { RegistrationConsentInput } from '@shared/policies';
import { UserProfileDto } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface CompanyData {
  companyName: string;
  business: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface AuthContextType {
  user: UserProfileDto | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, userType?: 'staff' | 'company', companyData?: CompanyData, weixin?: string, consents?: RegistrationConsentInput) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  permissions: Set<string>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<UserProfileDto | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setPermissions(new Set(userData.permissions || []));
      } else {
        // Token is invalid
        localStorage.removeItem('token');
        queryClient.clear();
        setToken(null);
        setUser(null);
        setPermissions(new Set());
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      queryClient.clear();
      setToken(null);
      setUser(null);
      setPermissions(new Set());
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await response.json();
    
    queryClient.clear();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
  };

  const register = async (name: string, email: string, password: string, userType: 'staff' | 'company' = 'staff', companyData?: CompanyData, weixin?: string, consents?: RegistrationConsentInput) => {
    const payload: any = { name, email, password, userType };
    if (userType === 'company' && companyData) {
      payload.companyData = companyData;
    }
    if (weixin) {
      payload.weixin = weixin;
    }
    if (consents) {
      payload.consents = consents;
    }
    
    const response = await apiRequest('POST', '/api/auth/register', payload);
    const data = await response.json();
    
    queryClient.clear();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
  };

  const logout = async () => {
    const currentToken = token;
    try {
      if (currentToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
          cache: 'no-store',
        });
      }
    } catch {
      // Local logout still completes if the network is unavailable. When the
      // request reaches the server, the account session version is revoked.
    } finally {
      setUser(null);
      setToken(null);
      setPermissions(new Set());
      queryClient.clear();
      localStorage.removeItem('token');
      setLocation('/');
    }
  };

  const hasPermission = (permission: string): boolean => {
    // Check for admin wildcard
    if (permissions.has('*')) return true;
    
    // Check for exact permission
    if (permissions.has(permission)) return true;
    
    // Check for wildcard permissions (e.g., "event.*" covers "event.create")
    const parts = permission.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const wildcard = parts.slice(0, i).join('.') + '.*';
      if (permissions.has(wildcard)) return true;
    }
    
    return false;
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some(p => hasPermission(p));
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    loading,
    permissions,
    hasPermission,
    hasAnyPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
