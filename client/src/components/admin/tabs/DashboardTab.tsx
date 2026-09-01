import { TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Calendar,
  FileText,
  MessageSquare,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useAdminDashboard } from '@/hooks/useAdminData';
import { QueryState } from '@/components/QueryState';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatLocalizedDate, formatLocalizedNumber } from '@/lib/i18n';

const statusLabels: Record<string, string> = {
  new: '신규',
  in_progress: '처리 중',
  resolved: '해결됨',
  draft: '임시저장',
  published: '게시됨',
  archived: '보관됨',
};

function statusLabel(status: string) {
  return statusLabels[status] || status;
}

export function DashboardTab({ activeTab }: { activeTab: string }) {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const dashboardQuery = useAdminDashboard(activeTab);
  const { data: dashboard } = dashboardQuery;
  const stats = dashboard?.stats;

  const openTab = (tab: string) => setLocation(`/admin?tab=${tab}`);
  const formatDate = (value: string) => formatLocalizedDate(value, language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TabsContent value="dashboard" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">관리자 대시보드</h2>
          <p className="text-sm text-muted-foreground mt-1">주요 관리 현황과 최근 작업을 한눈에 확인하세요.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => dashboardQuery.refetch()}
          disabled={dashboardQuery.isFetching}
          data-testid="button-refresh-admin-dashboard"
        >
          <RefreshCw className={`h-4 w-4 ${dashboardQuery.isFetching ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      <QueryState
        isLoading={dashboardQuery.isLoading}
        isError={dashboardQuery.isError}
        onRetry={() => dashboardQuery.refetch()}
        empty={!dashboard}
        emptyMessage="대시보드 데이터가 없습니다."
      >
        {stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                label="회원사"
                value={formatLocalizedNumber(stats.totalMembers, language)}
                detail={`활성 ${formatLocalizedNumber(stats.activeMembers, language)} · 승인 대기 ${formatLocalizedNumber(stats.pendingMembers, language)}`}
                icon={<Users className="h-8 w-8 text-blue-500" />}
                onClick={() => openTab('members')}
                testId="dashboard-kpi-members"
              />
              <KpiCard
                label="콘텐츠"
                value={formatLocalizedNumber(stats.totalContent, language)}
                detail={`미게시 ${formatLocalizedNumber(stats.unpublishedContent, language)} · 뉴스 ${formatLocalizedNumber(stats.totalNews, language)}`}
                icon={<FileText className="h-8 w-8 text-green-500" />}
                onClick={() => openTab('articles')}
                testId="dashboard-kpi-content"
              />
              <KpiCard
                label="행사"
                value={formatLocalizedNumber(stats.totalEvents, language)}
                detail={`예정 ${formatLocalizedNumber(stats.upcomingEvents, language)} · 미게시 ${formatLocalizedNumber(stats.unpublishedEvents, language)}`}
                icon={<Calendar className="h-8 w-8 text-purple-500" />}
                onClick={() => openTab('events')}
                testId="dashboard-kpi-events"
              />
              <KpiCard
                label="문의"
                value={formatLocalizedNumber(stats.totalInquiries, language)}
                detail={`미해결 ${formatLocalizedNumber(stats.unresolvedInquiries, language)}`}
                icon={<MessageSquare className="h-8 w-8 text-orange-500" />}
                onClick={() => openTab('inquiries')}
                testId="dashboard-kpi-inquiries"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <DashboardListCard
                title="최근 문의"
                description="최근 접수된 문의를 확인하세요."
                icon={<MessageSquare className="h-5 w-5 text-orange-500" />}
                actionLabel="문의 관리"
                onAction={() => openTab('inquiries')}
                testId="dashboard-recent-inquiries"
              >
                {dashboard.recentInquiries.length === 0 ? (
                  <EmptyList message="최근 문의가 없습니다." />
                ) : (
                  dashboard.recentInquiries.map((inquiry) => (
                    <div key={inquiry.id} className="flex items-center justify-between gap-3 border-b last:border-0 py-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{inquiry.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {inquiry.category} · {formatDate(inquiry.createdAt)}
                        </p>
                      </div>
                      <Badge variant={inquiry.status === 'resolved' ? 'secondary' : 'default'}>
                        {statusLabel(inquiry.status)}
                      </Badge>
                    </div>
                  ))
                )}
              </DashboardListCard>

              <DashboardListCard
                title="예정 행사"
                description="다가오는 행사 일정을 확인하세요."
                icon={<Calendar className="h-5 w-5 text-purple-500" />}
                actionLabel="행사 관리"
                onAction={() => openTab('events')}
                testId="dashboard-upcoming-events"
              >
                {dashboard.upcomingEvents.length === 0 ? (
                  <EmptyList message="예정된 행사가 없습니다." />
                ) : (
                  dashboard.upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-start justify-between gap-3 border-b last:border-0 py-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(event.eventDate)}
                          {event.location ? ` · ${event.location}` : ''}
                        </p>
                      </div>
                      <Badge variant={event.status === 'published' ? 'secondary' : 'outline'}>
                        {statusLabel(event.status)}
                      </Badge>
                    </div>
                  ))
                )}
              </DashboardListCard>
            </div>

            <section aria-labelledby="dashboard-quick-actions">
              <h3 id="dashboard-quick-actions" className="text-lg font-semibold mb-3">빠른 작업</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <QuickAction label="뉴스 생성" onClick={() => setLocation('/admin?tab=articles&action=create')} />
                <QuickAction label="행사 생성" onClick={() => setLocation('/admin?tab=events&action=create')} />
                <QuickAction label="문의 검토" onClick={() => openTab('inquiries')} />
                <QuickAction label="회원사 관리" onClick={() => openTab('members')} />
              </div>
            </section>
          </>
        )}
      </QueryState>
    </TabsContent>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon,
  onClick,
  testId,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      className="text-left p-5 border rounded-lg bg-card hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-2">{detail}</p>
        </div>
        {icon}
      </div>
    </button>
  );
}

function DashboardListCard({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  testId,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border rounded-lg bg-card p-5" data-testid={testId}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onAction}>
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <div>{children}</div>
    </section>
  );
}

function EmptyList({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" className="justify-start h-11" onClick={onClick}>
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}