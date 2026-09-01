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
export type AdminPostFilters = {
  search?: string;
  status?: string;
  category?: string;
  visibility?: string;
  upcoming?: string;
};
type PostsResponse = { posts: PostWithTranslations[]; total: number; page: number; totalPages: number };

export function useAdminPosts(
  postType: 'news' | 'event' | 'resource' | 'page',
  activeTab: string,
  page = 1,
  filters: AdminPostFilters = {},
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
    queryKey: queryKeys.posts.list({ postType, admin: true, page, limit: 50, ...filters }),
    queryFn: () => {
      const params = new URLSearchParams({
        postType,
        admin: 'true',
        page: page.toString(),
        limit: '50',
      });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      return fetchJson<PostsResponse>(`/api/posts?${params.toString()}`);
    },
    enabled: canRead && activeTab === tabNames[postType],
  });
}

export type AdminMemberFilters = {
  search?: string;
  country?: string;
  industry?: string;
  membershipLevel?: string;
  membershipStatus?: string;
};
type MembersResponse = { members: Member[]; total: number; page: number; totalPages: number };

export function useAdminMembers(activeTab: string, page = 1, filters: AdminMemberFilters = {}) {
  const { isAdmin, hasPermission } = useAuth();
  const canRead = isAdmin || hasPermission('member.read');
  return useQuery<MembersResponse>({
    queryKey: ['/api/admin/members', { page, limit: 50, ...filters }],
    queryFn: () =>
      fetchJson<MembersResponse>(`/api/admin/members?${new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.country ? { country: filters.country } : {}),
        ...(filters.industry ? { industry: filters.industry } : {}),
        ...(filters.membershipLevel ? { membershipLevel: filters.membershipLevel } : {}),
        ...(filters.membershipStatus ? { membershipStatus: filters.membershipStatus } : {}),
      }).toString()}`),
    enabled: canRead && activeTab === 'members',
  });
}

type UsersResponse = { users: User[]; total: number; page: number; totalPages: number };

export function useAdminUsers(
  activeTab: string,
  page: number,
  filters: { search?: string; role?: string; isActive?: string } = {},
) {
  const { isAdmin } = useAuth();
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '50',
  });
  if (filters.search) params.set('search', filters.search);
  if (filters.role) params.set('role', filters.role);
  if (filters.isActive) params.set('isActive', filters.isActive);
  return useQuery<UsersResponse>({
    queryKey: ['/api/users', { page, limit: 50, ...filters }],
    queryFn: () => fetchJson<UsersResponse>(`/api/users?${params.toString()}`),
    enabled: isAdmin && activeTab === 'users',
  });
}

type PartnersResponse = { partners: Partner[]; total: number; page: number; totalPages: number };

export type AdminPartnerFilters = {
  search?: string;
  category?: string;
  isActive?: string;
};

export function useAdminPartners(activeTab: string, page: number, filters: AdminPartnerFilters = {}) {
  const { isAdmin, hasPermission } = useAuth();
  const canManagePartners = isAdmin || hasPermission('partner.manage');
  return useQuery<PartnersResponse>({
    queryKey: ['/api/partners', { admin: true, page, limit: 50, ...filters }],
    queryFn: () => fetchJson<PartnersResponse>(`/api/partners?${new URLSearchParams({
      admin: 'true',
      page: page.toString(),
      limit: '50',
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.isActive ? { isActive: filters.isActive } : {}),
    }).toString()}`),
    enabled: canManagePartners && activeTab === 'partners',
  });
}

type InquiriesResponse = { inquiries: InquiryWithReplies[]; total: number; page: number; totalPages: number };

export type AdminInquiryFilters = {
  search?: string;
  category?: string;
  status?: string;
};

export function useAdminInquiries(activeTab: string, page = 1, filters: AdminInquiryFilters = {}) {
  const { isAdmin, hasPermission } = useAuth();
  const canRead = isAdmin || hasPermission('inquiry.read');
  return useQuery<InquiriesResponse>({
    queryKey: ['/api/inquiries', { page, limit: 50, ...filters }],
    queryFn: () => fetchJson<InquiriesResponse>(`/api/inquiries?${new URLSearchParams({
      page: page.toString(),
      limit: '50',
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    }).toString()}`),
    enabled: canRead && activeTab === 'inquiries',
  });
}

export type AdminSurveyFilters = {
  search?: string;
  status?: string;
};

export function useAdminSurvey(activeTab: string, page = 1, filters: AdminSurveyFilters = {}) {
  const { isAdmin, hasPermission } = useAuth();
  const canManage = isAdmin || hasPermission('survey.manage');
  return useQuery<{ surveys: SurveySettings[]; total: number; page: number; totalPages: number }>({
    queryKey: ['/api/admin/survey', { page, limit: 50, ...filters }],
    queryFn: () => fetchJson<{ surveys: SurveySettings[]; total: number; page: number; totalPages: number }>(
      `/api/admin/survey?${new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      }).toString()}`,
    ),
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
  filters: { search?: string } = {},
) {
  const { user, isAdmin, hasPermission } = useAuth();
  const canRead = isAdmin
    || (user?.role === 'operator' && hasPermission('organization.executives.read'));
  const category = isAdmin ? categoryFilter : 'all';
  return useQuery<{ members: OrganizationMember[]; total: number; page: number; totalPages: number }>({
    queryKey: ['/api/organization-members', { category, admin: true, page, limit: 50, ...filters }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('isActive', 'false');
      params.append('page', page.toString());
      params.append('limit', '50');
      if (isAdmin && category && category !== 'all') {
        params.append('category', category);
      }
      if (filters.search) params.append('search', filters.search);
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
  surveyId: string | undefined,
  page: number,
  limit = 10,
  snapshotVersion?: number,
) {
  const { isAdmin, hasPermission } = useAuth();
  const canManage = isAdmin || hasPermission('survey.manage');
  return useQuery<SurveyHistoryResponse>({
    queryKey: ['/api/admin/survey/history', { surveyId, page, limit, snapshotVersion }],
    queryFn: () => fetchJson<SurveyHistoryResponse>(
      `/api/admin/survey/history?page=${page}&limit=${limit}${
        snapshotVersion ? `&snapshotVersion=${snapshotVersion}` : ''
      }${surveyId ? `&surveyId=${encodeURIComponent(surveyId)}` : ''}`,
    ),
    enabled: canManage && activeTab === 'survey' && Boolean(surveyId),
  });
}
