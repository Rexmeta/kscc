import { lazy, Suspense, useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

const DashboardTab = lazy(() => import('@/components/admin/tabs/DashboardTab').then((module) => ({ default: module.DashboardTab })));
const UsersTab = lazy(() => import('@/components/admin/tabs/UsersTab').then((module) => ({ default: module.UsersTab })));
const MembersTab = lazy(() => import('@/components/admin/tabs/MembersTab').then((module) => ({ default: module.MembersTab })));
const EventsTab = lazy(() => import('@/components/admin/tabs/EventsTab').then((module) => ({ default: module.EventsTab })));
const ArticlesTab = lazy(() => import('@/components/admin/tabs/ArticlesTab').then((module) => ({ default: module.ArticlesTab })));
const ResourcesTab = lazy(() => import('@/components/admin/tabs/ResourcesTab').then((module) => ({ default: module.ResourcesTab })));
const PagesTab = lazy(() => import('@/components/admin/tabs/PagesTab').then((module) => ({ default: module.PagesTab })));
const PartnersTab = lazy(() => import('@/components/admin/tabs/PartnersTab').then((module) => ({ default: module.PartnersTab })));
const OrganizationTab = lazy(() => import('@/components/admin/tabs/OrganizationTab').then((module) => ({ default: module.OrganizationTab })));
const InquiriesTab = lazy(() => import('@/components/admin/tabs/InquiriesTab').then((module) => ({ default: module.InquiriesTab })));
const ManualTab = lazy(() => import('@/components/admin/tabs/ManualTab').then((module) => ({ default: module.ManualTab })));
const SurveyTab = lazy(() => import('@/components/admin/tabs/SurveyTab').then((module) => ({ default: module.SurveyTab })));

const boardTabConfig = [
  { tab: 'articles', permission: 'news.read' },
  { tab: 'events', permission: 'event.read' },
  { tab: 'resources', permission: 'resource.read' },
] as const;

export default function AdminPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const requestedUrlTab = params.get('tab') || 'dashboard';
  const urlTab = requestedUrlTab === 'executives' ? 'organization' : requestedUrlTab;

  const [activeTab, setActiveTab] = useState(urlTab);
  const [createNewsDialogOpen, setCreateNewsDialogOpen] = useState(false);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [createResourceDialogOpen, setCreateResourceDialogOpen] = useState(false);
  const { user, isAdmin, loading, hasPermission } = useAuth();
  const boardTabs = boardTabConfig
    .filter(({ permission }) => isAdmin || hasPermission(permission))
    .map(({ tab }) => tab);
  const canReadMembers = isAdmin || hasPermission('member.read');
  const canReadInquiries = isAdmin || hasPermission('inquiry.read');
  const canManageSurvey = isAdmin || hasPermission('survey.manage');
  const canReadPages = isAdmin || hasPermission('page.read');
  const canUpdatePages = isAdmin || hasPermission('page.update');
  const canManagePartners = isAdmin || hasPermission('partner.manage');
  const canReadOrganization = isAdmin
    || (user?.role === 'operator' && hasPermission('organization.executives.read'));
  const hasManual = isAdmin || user?.role === 'operator';
  const allowedTabs = isAdmin
    ? ['dashboard', 'users', 'members', 'articles', 'events', 'resources', 'pages', 'inquiries', 'organization', 'partners', 'survey', ...(hasManual ? ['manual'] : [])]
    : [...boardTabs, ...(canReadMembers ? ['members'] : []), ...(canReadPages ? ['pages'] : []), ...(canReadInquiries ? ['inquiries'] : []), ...(canReadOrganization ? ['organization'] : []), ...(canManagePartners ? ['partners'] : []), ...(canManageSurvey ? ['survey'] : []), ...(hasManual ? ['manual'] : [])];
  const allowedTabsKey = allowedTabs.join(',');
  const defaultTab = isAdmin
    ? 'dashboard'
    : boardTabs[0] || (canReadInquiries ? 'inquiries' : canReadOrganization ? 'organization' : canManagePartners ? 'partners' : canManageSurvey ? 'survey' : 'dashboard');
  const canAccessAdmin = isAdmin || boardTabs.length > 0 || canReadMembers || canReadPages || canReadInquiries || canReadOrganization || canManagePartners || canManageSurvey;

  useEffect(() => {
    if (loading) return;

    const newParams = new URLSearchParams(search);
    const requestedTab = newParams.get('tab') || defaultTab;
    const normalizedRequestedTab = requestedTab === 'executives' ? 'organization' : requestedTab;
    const action = newParams.get('action');
    const tab = allowedTabs.includes(normalizedRequestedTab) ? normalizedRequestedTab : defaultTab;

    setActiveTab(tab);

    if (action === 'create' && tab === normalizedRequestedTab) {
      if (tab === 'articles' || tab === 'news') {
        setCreateNewsDialogOpen(true);
      } else if (tab === 'events') {
        setCreateEventDialogOpen(true);
      } else if (tab === 'resources') {
        setCreateResourceDialogOpen(true);
      }
      navigate(`/admin?tab=${tab}`, { replace: true });
    } else if (tab !== requestedTab) {
      navigate(`/admin?tab=${tab}`, { replace: true });
    }
  }, [search, loading, defaultTab, allowedTabsKey]);

  const handleTabChange = (newTab: string) => {
    if (!allowedTabs.includes(newTab)) return;
    setActiveTab(newTab);
    navigate(`/admin?tab=${newTab}`, { replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">권한 확인 중...</p>
      </div>
    );
  }

  if (!canAccessAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">게시판 관리 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="md:hidden">
            <Select value={activeTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full" data-testid="mobile-tab-select">
                <SelectValue placeholder="메뉴 선택" />
              </SelectTrigger>
              <SelectContent>
                {isAdmin && <SelectItem value="dashboard" data-testid="option-tab-dashboard">대시보드</SelectItem>}
                {isAdmin && <SelectItem value="users" data-testid="option-tab-users">사용자</SelectItem>}
                 {allowedTabs.includes('members') && <SelectItem value="members" data-testid="option-tab-members">회원사</SelectItem>}
                {allowedTabs.includes('articles') && <SelectItem value="articles" data-testid="option-tab-articles">뉴스</SelectItem>}
                {allowedTabs.includes('events') && <SelectItem value="events" data-testid="option-tab-events">행사</SelectItem>}
                {allowedTabs.includes('resources') && <SelectItem value="resources" data-testid="option-tab-resources">자료</SelectItem>}
                {allowedTabs.includes('pages') && <SelectItem value="pages" data-testid="option-tab-pages">페이지</SelectItem>}
                 {allowedTabs.includes('inquiries') && <SelectItem value="inquiries" data-testid="option-tab-inquiries">문의</SelectItem>}
                {allowedTabs.includes('organization') && <SelectItem value="organization" data-testid="option-tab-organization">조직</SelectItem>}
                 {allowedTabs.includes('partners') && <SelectItem value="partners" data-testid="option-tab-partners">파트너</SelectItem>}
                 {allowedTabs.includes('survey') && <SelectItem value="survey" data-testid="option-tab-survey">설문</SelectItem>}
                {hasManual && (
                  <SelectItem value="manual" data-testid="option-tab-manual">매뉴얼</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full gap-1">
              {isAdmin && <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="text-sm whitespace-nowrap">대시보드</TabsTrigger>}
              {isAdmin && <TabsTrigger value="users" data-testid="tab-users" className="text-sm whitespace-nowrap">사용자</TabsTrigger>}
               {allowedTabs.includes('members') && <TabsTrigger value="members" data-testid="tab-members" className="text-sm whitespace-nowrap">회원사</TabsTrigger>}
              {allowedTabs.includes('articles') && <TabsTrigger value="articles" data-testid="tab-articles" className="text-sm whitespace-nowrap">뉴스</TabsTrigger>}
              {allowedTabs.includes('events') && <TabsTrigger value="events" data-testid="tab-events" className="text-sm whitespace-nowrap">행사</TabsTrigger>}
              {allowedTabs.includes('resources') && <TabsTrigger value="resources" data-testid="tab-resources" className="text-sm whitespace-nowrap">자료</TabsTrigger>}
               {allowedTabs.includes('pages') && <TabsTrigger value="pages" data-testid="tab-pages" className="text-sm whitespace-nowrap">페이지</TabsTrigger>}
               {allowedTabs.includes('inquiries') && <TabsTrigger value="inquiries" data-testid="tab-inquiries" className="text-sm whitespace-nowrap">문의</TabsTrigger>}
               {allowedTabs.includes('organization') && <TabsTrigger value="organization" data-testid="tab-organization" className="text-sm whitespace-nowrap">조직</TabsTrigger>}
               {allowedTabs.includes('partners') && <TabsTrigger value="partners" data-testid="tab-partners" className="text-sm whitespace-nowrap">파트너</TabsTrigger>}
               {allowedTabs.includes('survey') && <TabsTrigger value="survey" data-testid="tab-survey" className="text-sm whitespace-nowrap">설문</TabsTrigger>}
              {hasManual && (
                <TabsTrigger value="manual" data-testid="tab-manual" className="text-sm whitespace-nowrap">매뉴얼</TabsTrigger>
              )}
            </TabsList>
          </div>

          <Suspense fallback={<div className="py-12 text-center text-muted-foreground">로딩 중...</div>}>
            {isAdmin && activeTab === 'dashboard' && <DashboardTab activeTab={activeTab} />}
            {isAdmin && activeTab === 'users' && <UsersTab activeTab={activeTab} />}
            {allowedTabs.includes('members') && activeTab === 'members' && <MembersTab activeTab={activeTab} />}
            {allowedTabs.includes('articles') && activeTab === 'articles' && (
              <ArticlesTab
                activeTab={activeTab}
                createNewsDialogOpen={createNewsDialogOpen}
                setCreateNewsDialogOpen={setCreateNewsDialogOpen}
              />
            )}
            {allowedTabs.includes('events') && activeTab === 'events' && (
              <EventsTab
                activeTab={activeTab}
                createEventDialogOpen={createEventDialogOpen}
                setCreateEventDialogOpen={setCreateEventDialogOpen}
              />
            )}
            {allowedTabs.includes('resources') && activeTab === 'resources' && (
              <ResourcesTab
                activeTab={activeTab}
                createResourceDialogOpen={createResourceDialogOpen}
                setCreateResourceDialogOpen={setCreateResourceDialogOpen}
              />
            )}
             {allowedTabs.includes('pages') && activeTab === 'pages' && (
               <PagesTab activeTab={activeTab} canEdit={canUpdatePages} />
             )}
             {allowedTabs.includes('partners') && activeTab === 'partners' && <PartnersTab activeTab={activeTab} />}
             {allowedTabs.includes('survey') && activeTab === 'survey' && <SurveyTab activeTab={activeTab} />}
            {allowedTabs.includes('organization') && activeTab === 'organization' && (
              <OrganizationTab activeTab={activeTab} />
            )}
             {allowedTabs.includes('inquiries') && activeTab === 'inquiries' && <InquiriesTab activeTab={activeTab} />}
            {activeTab === 'manual' && hasManual && <ManualTab />}
          </Suspense>
        </Tabs>
      </main>
    </div>
  );
}
