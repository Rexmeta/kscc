import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface CompanyData {
  companyName: string;
  business: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, userType?: 'staff' | 'company', companyData?: CompanyData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  permissions: Set<string>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setPermissions(new Set(userData.permissions || []));
      } else {
        // Token is invalid
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setPermissions(new Set());
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setPermissions(new Set());
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await response.json();
    
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
  };

  const register = async (name: string, email: string, password: string, userType: 'staff' | 'company' = 'staff', companyData?: CompanyData) => {
    const payload: any = { name, email, password, userType };
    if (userType === 'company' && companyData) {
      payload.companyData = companyData;
    }
    
    const response = await apiRequest('POST', '/api/auth/register', payload);
    const data = await response.json();
    
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPermissions(new Set());
    localStorage.removeItem('token');
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
