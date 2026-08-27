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

export default function AdminPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const urlTab = params.get('tab') || 'dashboard';
  const urlAction = params.get('action');

  const [activeTab, setActiveTab] = useState(urlTab);
  const [createNewsDialogOpen, setCreateNewsDialogOpen] = useState(false);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [createResourceDialogOpen, setCreateResourceDialogOpen] = useState(false);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const newParams = new URLSearchParams(search);
    const tab = newParams.get('tab') || 'dashboard';
    const action = newParams.get('action');

    setActiveTab(tab);

    if (action === 'create') {
      if (tab === 'articles' || tab === 'news') {
        setCreateNewsDialogOpen(true);
      } else if (tab === 'events') {
        setCreateEventDialogOpen(true);
      } else if (tab === 'resources') {
        setCreateResourceDialogOpen(true);
      }
      navigate(`/admin?tab=${tab}`, { replace: true });
    }
  }, [search]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    navigate(`/admin?tab=${newTab}`, { replace: true });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">관리자만 접근 가능합니다.</p>
      </div>
    );
  }

  const hasManual = user?.role === 'admin' || user?.role === 'operator';

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
                <SelectItem value="dashboard" data-testid="option-tab-dashboard">대시보드</SelectItem>
                <SelectItem value="users" data-testid="option-tab-users">사용자</SelectItem>
                <SelectItem value="members" data-testid="option-tab-members">회원</SelectItem>
                <SelectItem value="articles" data-testid="option-tab-articles">뉴스</SelectItem>
                <SelectItem value="events" data-testid="option-tab-events">행사</SelectItem>
                <SelectItem value="resources" data-testid="option-tab-resources">자료</SelectItem>
                <SelectItem value="pages" data-testid="option-tab-pages">페이지</SelectItem>
                <SelectItem value="inquiries" data-testid="option-tab-inquiries">문의</SelectItem>
                <SelectItem value="organization" data-testid="option-tab-organization">조직</SelectItem>
                <SelectItem value="partners" data-testid="option-tab-partners">파트너</SelectItem>
                {hasManual && (
                  <SelectItem value="manual" data-testid="option-tab-manual">매뉴얼</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full gap-1">
              <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="text-sm whitespace-nowrap">대시보드</TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users" className="text-sm whitespace-nowrap">사용자</TabsTrigger>
              <TabsTrigger value="members" data-testid="tab-members" className="text-sm whitespace-nowrap">회원</TabsTrigger>
              <TabsTrigger value="articles" data-testid="tab-articles" className="text-sm whitespace-nowrap">뉴스</TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events" className="text-sm whitespace-nowrap">행사</TabsTrigger>
              <TabsTrigger value="resources" data-testid="tab-resources" className="text-sm whitespace-nowrap">자료</TabsTrigger>
              <TabsTrigger value="pages" data-testid="tab-pages" className="text-sm whitespace-nowrap">페이지</TabsTrigger>
              <TabsTrigger value="inquiries" data-testid="tab-inquiries" className="text-sm whitespace-nowrap">문의</TabsTrigger>
              <TabsTrigger value="organization" data-testid="tab-organization" className="text-sm whitespace-nowrap">조직</TabsTrigger>
              <TabsTrigger value="partners" data-testid="tab-partners" className="text-sm whitespace-nowrap">파트너</TabsTrigger>
              {hasManual && (
                <TabsTrigger value="manual" data-testid="tab-manual" className="text-sm whitespace-nowrap">매뉴얼</TabsTrigger>
              )}
            </TabsList>
          </div>

          <Suspense fallback={<div className="py-12 text-center text-muted-foreground">로딩 중...</div>}>
            {activeTab === 'dashboard' && <DashboardTab activeTab={activeTab} />}
            {activeTab === 'users' && <UsersTab activeTab={activeTab} />}
            {activeTab === 'members' && <MembersTab activeTab={activeTab} />}
            {activeTab === 'articles' && (
              <ArticlesTab
                activeTab={activeTab}
                createNewsDialogOpen={createNewsDialogOpen}
                setCreateNewsDialogOpen={setCreateNewsDialogOpen}
              />
            )}
            {activeTab === 'events' && (
              <EventsTab
                activeTab={activeTab}
                createEventDialogOpen={createEventDialogOpen}
                setCreateEventDialogOpen={setCreateEventDialogOpen}
              />
            )}
            {activeTab === 'resources' && (
              <ResourcesTab
                activeTab={activeTab}
                createResourceDialogOpen={createResourceDialogOpen}
                setCreateResourceDialogOpen={setCreateResourceDialogOpen}
              />
            )}
            {activeTab === 'pages' && <PagesTab activeTab={activeTab} />}
            {activeTab === 'partners' && <PartnersTab activeTab={activeTab} />}
            {activeTab === 'organization' && <OrganizationTab activeTab={activeTab} />}
            {activeTab === 'inquiries' && <InquiriesTab activeTab={activeTab} />}
            {activeTab === 'manual' && hasManual && <ManualTab />}
          </Suspense>
        </Tabs>
      </main>
    </div>
  );
}
