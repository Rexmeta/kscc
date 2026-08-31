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
  SurveySettings,
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
  const { isAdmin, hasPermission } = useAuth();
  const canRead = isAdmin || hasPermission('member.read');
  return useQuery<MembersResponse>({
    queryKey: ['/api/admin/members'],
    queryFn: () =>
      fetchJson<MembersResponse>('/api/admin/members'),
    enabled: canRead && activeTab === 'members',
  });
}

type UsersResponse = { users: User[]; total: number; page: number; totalPages: number };

export function useAdminUsers(activeTab: string, page: number) {
  const { isAdmin } = useAuth();
  return useQuery<UsersResponse>({
    queryKey: ['/api/users', { page, limit: 50 }],
    queryFn: () => fetchJson<UsersResponse>(`/api/users?page=${page}&limit=50`),
    enabled: isAdmin && activeTab === 'users',
  });
}

type PartnersResponse = { partners: Partner[]; total: number; page: number; totalPages: number };

export function useAdminPartners(activeTab: string, page: number) {
  const { isAdmin } = useAuth();
  return useQuery<PartnersResponse>({
    queryKey: ['/api/partners', { admin: true, page, limit: 50 }],
    queryFn: () => fetchJson<PartnersResponse>(`/api/partners?admin=true&page=${page}&limit=50`),
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

export function useAdminSurvey(activeTab: string) {
  const { isAdmin, hasPermission } = useAuth();
  const canManage = isAdmin || hasPermission('survey.manage');
  return useQuery<SurveySettings>({
    queryKey: ['/api/admin/survey'],
    queryFn: () => fetchJson<SurveySettings>('/api/admin/survey'),
    enabled: canManage && activeTab === 'survey',
  });
}

export function useAdminOrganizationMembers(
  categoryFilter: string,
  activeTab: string,
  executivesOnly = false,
  page = 1,
) {
  const { user, isAdmin, hasPermission } = useAuth();
  const canRead = isAdmin
    || (user?.role === 'operator' && hasPermission('organization.executives.read'));
  const category = executivesOnly ? 'all' : categoryFilter;
  const tabName = executivesOnly ? 'executives' : 'organization';
  return useQuery<{ members: OrganizationMember[]; total: number; page: number; totalPages: number }>({
    queryKey: ['/api/organization-members', { category, admin: true, page, limit: 50 }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('isActive', 'false');
      params.append('page', page.toString());
      params.append('limit', '50');
      if (!executivesOnly && category && category !== 'all') {
        params.append('category', category);
      }
      return fetchJson<{ members: OrganizationMember[]; total: number; page: number; totalPages: number }>(
        `/api/organization-members?${params.toString()}`
      );
    },
    enabled: canRead && activeTab === tabName,
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
