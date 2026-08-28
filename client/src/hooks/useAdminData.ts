import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryClient';
import type {
  PostWithTranslations,
  Member,
  OrganizationMember,
  User,
  Partner,
  InquiryWithReplies,
} from '@shared/schema';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.json() as Promise<T>;
}

type PostsResponse = { posts: PostWithTranslations[]; total: number };

export function useAdminPosts(
  postType: 'news' | 'event' | 'resource' | 'page',
  activeTab: string
) {
  const { isAdmin, hasPermission } = useAuth();
  const tabNames: Record<typeof postType, string> = {
    news: 'articles',
    event: 'events',
    resource: 'resources',
    page: 'pages',
  };
  const canRead = isAdmin || hasPermission(`${postType}.read`);
  return useQuery<PostsResponse>({
    queryKey: queryKeys.posts.list({ postType, admin: true }),
    queryFn: () =>
      fetchJson<PostsResponse>(`/api/posts?postType=${postType}&admin=true`),
    enabled: canRead && activeTab === tabNames[postType],
  });
}

type MembersResponse = { members: Member[]; total: number; page: number; totalPages: number };

export function useAdminMembers(activeTab: string) {
  const { isAdmin } = useAuth();
  return useQuery<MembersResponse>({
    queryKey: ['/api/admin/members'],
    queryFn: () =>
      fetchJson<MembersResponse>('/api/admin/members'),
    enabled: isAdmin && activeTab === 'members',
  });
}

export function useAdminUsers(activeTab: string) {
  const { isAdmin } = useAuth();
  return useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: () => fetchJson<User[]>('/api/users'),
    enabled: isAdmin && activeTab === 'users',
  });
}

export function useAdminPartners(activeTab: string) {
  const { isAdmin } = useAuth();
  return useQuery<Partner[]>({
    queryKey: ['/api/partners'],
    queryFn: () => fetchJson<Partner[]>('/api/partners'),
    enabled: isAdmin && activeTab === 'partners',
  });
}

type InquiriesResponse = { inquiries: InquiryWithReplies[]; total: number; page: number; totalPages: number };

export function useAdminInquiries(activeTab: string) {
  const { isAdmin, hasPermission } = useAuth();
  const canRead = isAdmin || hasPermission('inquiry.read');
  return useQuery<InquiriesResponse>({
    queryKey: ['/api/inquiries'],
    queryFn: () => fetchJson<InquiriesResponse>('/api/inquiries'),
    enabled: canRead && activeTab === 'inquiries',
  });
}

export function useAdminOrganizationMembers(
  categoryFilter: string,
  activeTab: string
) {
  const { isAdmin } = useAuth();
  return useQuery<OrganizationMember[]>({
    queryKey: ['/api/organization-members', { category: categoryFilter, admin: true }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('isActive', 'false');
      if (categoryFilter && categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      return fetchJson<OrganizationMember[]>(
        `/api/organization-members?${params.toString()}`
      );
    },
    enabled: isAdmin && activeTab === 'organization',
  });
}

type DashboardStats = {
  stats: {
    totalMembers: number;
    totalEvents: number;
    totalNews: number;
    totalInquiries: number;
  };
};

export function useAdminDashboard(activeTab: string) {
  const { isAdmin } = useAuth();
  return useQuery<DashboardStats>({
    queryKey: ['/api/admin/dashboard'],
    queryFn: () => fetchJson<DashboardStats>('/api/admin/dashboard'),
    enabled: isAdmin && activeTab === 'dashboard',
  });
}
