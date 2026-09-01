import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys, fetchJson } from '@/lib/queryClient';
import type {
  PostWithTranslations,
  Member,
  OrganizationMember,
  User,
  Partner,
  InquiryWithReplies,
  SurveySettings,
  SurveySettingsHistory,
  PostTranslationHistory,
} from '@shared/schema';
import type { AdminDashboardSnapshot } from '@shared/adminDashboard';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});
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
    queryFn: () => fetchJson<PostsResponse>(`/api/posts?postType=${postType}&admin=true`),
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

export type SurveyHistoryResponse = {
  history: SurveySettingsHistory[];
  total: number;
  page: number;
  totalPages: number;
  snapshotVersion: number;
};

export type PageTranslationHistoryEntry = PostTranslationHistory & {
  postSlug: string;
};

export type PageTranslationHistoryResponse = {
  history: PageTranslationHistoryEntry[];
  total: number;
  page: number;
  totalPages: number;
};

export function useAdminPageTranslationHistory(
  activeTab: string,
  page: number,
  limit = 10,
) {
  const { isAdmin, hasPermission } = useAuth();
  const canRead = isAdmin || hasPermission('page.read');
  return useQuery<PageTranslationHistoryResponse>({
    queryKey: ['/api/posts/history', { page, limit }],
    queryFn: () => fetchJson<PageTranslationHistoryResponse>(
      `/api/posts/history?page=${page}&limit=${limit}`,
    ),
    enabled: canRead && activeTab === 'pages',
  });
}

export function useAdminOrganizationMembers(
  categoryFilter: string,
  activeTab: string,
  page = 1,
) {
  const { user, isAdmin, hasPermission } = useAuth();
  const canRead = isAdmin
    || (user?.role === 'operator' && hasPermission('organization.executives.read'));
  const category = isAdmin ? categoryFilter : 'all';
  return useQuery<{ members: OrganizationMember[]; total: number; page: number; totalPages: number }>({
    queryKey: ['/api/organization-members', { category, admin: true, page, limit: 50 }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('isActive', 'false');
      params.append('page', page.toString());
      params.append('limit', '50');
      if (isAdmin && category && category !== 'all') {
        params.append('category', category);
      }
      return fetchJson<{ members: OrganizationMember[]; total: number; page: number; totalPages: number }>(
        `/api/organization-members?${params.toString()}`
      );
    },
    enabled: canRead && activeTab === 'organization',
  });
}

export function useAdminDashboard(activeTab: string) {
  const { isAdmin } = useAuth();
  return useQuery<AdminDashboardSnapshot>({
    queryKey: ['/api/admin/dashboard', 'snapshot-v1'],
    queryFn: () => fetchJson<AdminDashboardSnapshot>('/api/admin/dashboard', { cache: 'no-store' }),
    enabled: isAdmin && activeTab === 'dashboard',
    refetchOnMount: 'always',
  });
}

export function useAdminSurveyHistory(
  activeTab: string,
  page: number,
  limit = 10,
  snapshotVersion?: number,
) {
  const { isAdmin, hasPermission } = useAuth();
  const canManage = isAdmin || hasPermission('survey.manage');
  return useQuery<SurveyHistoryResponse>({
    queryKey: ['/api/admin/survey/history', { page, limit, snapshotVersion }],
    queryFn: () => fetchJson<SurveyHistoryResponse>(
      `/api/admin/survey/history?page=${page}&limit=${limit}${
        snapshotVersion ? `&snapshotVersion=${snapshotVersion}` : ''
      }`,
    ),
    enabled: canManage && activeTab === 'survey',
  });
}
