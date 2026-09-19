import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ExternalLink, ShieldAlert } from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { TabsContent } from '@/components/ui/tabs';
import { QueryState } from '@/components/QueryState';
import { AdminFilterBar } from '../AdminFilterBar';
import { AdminListPagination } from '../AdminListPagination';
import { fetchJson, queryKeys } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import { memberServiceCategoryLabel } from '@/lib/memberServiceCategories';
import { useLanguage } from '@/contexts/LanguageContext';

type AdminOrganization = {
  id: string;
  sourceRecordKey: string;
  organizationType: string;
  summaryKo: string | null;
  websiteUrl: string | null;
  verificationStatus: string;
  nextReviewAt: string | null;
  publicApproved: boolean;
  isActive: boolean;
  localizations: Array<{
    locale: string;
    officialName: string;
    displayName: string | null;
  }>;
};

type AdminDirectoryResponse = {
  organizations: AdminOrganization[];
  categories: string[];
  total: number;
  page: number;
  totalPages: number;
};

function canPublish(organization: AdminOrganization) {
  const verified = ['verified_official', 'verified_register'].includes(organization.verificationStatus);
  const current = !organization.nextReviewAt || new Date(organization.nextReviewAt).getTime() > Date.now();
  return verified && current;
}

export function KoreaChinaOrganizationsTab({ activeTab }: { activeTab: string }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('all');
  const [filters, setFilters] = useState({ search: '', category: 'all' });

  const directory = useQuery({
    queryKey: queryKeys.memberService.adminDirectory({
      q: filters.search,
      organizationType: filters.category,
      page,
      limit: 12,
    }),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), limit: '12', language: 'ko' });
      if (filters.search) params.set('q', filters.search);
      if (filters.category !== 'all') params.set('organizationType', filters.category);
      return fetchJson<AdminDirectoryResponse>(
        `/api/member-service/v1/admin/directory?${params}`,
        { signal },
      );
    },
    enabled: activeTab === 'korea-china-organizations',
  });

  const visibility = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) => fetchJson(
      `/api/member-service/v1/admin/directory/${id}/visibility`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible }),
      },
    ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/member-service/v1/admin/directory'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/member-service/v1/directory'] }),
      ]);
    },
  });

  return (
    <TabsContent value="korea-china-organizations" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('koreaChina.adminTitle')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('koreaChina.adminSubtitle')}</p>
      </div>

      <AdminFilterBar
        scope="korea-china-organizations"
        search={searchInput}
        onSearchChange={setSearchInput}
        onApply={() => {
          setPage(1);
          setFilters({ search: searchInput.trim(), category: categoryInput });
        }}
        onReset={() => {
          setPage(1);
          setSearchInput('');
          setCategoryInput('all');
          setFilters({ search: '', category: 'all' });
        }}
        searchLabel={t('common.search')}
        searchPlaceholder={t('memberService.searchPlaceholder')}
        total={directory.data?.total}
        filters={[{
          name: 'category',
          label: t('koreaChina.categories'),
          value: categoryInput,
          onChange: setCategoryInput,
          testId: 'select-korea-china-category',
          options: [
            { value: 'all', label: t('koreaChina.allCategories') },
            ...(directory.data?.categories ?? []).map((category) => ({
              value: category,
              label: memberServiceCategoryLabel(category, language),
            })),
          ],
        }]}
      />

      {visibility.isError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {t('koreaChina.verificationRequired')}
        </p>
      )}

      <QueryState
        isLoading={directory.isLoading}
        isError={directory.isError}
        onRetry={() => directory.refetch()}
        empty={!directory.data?.organizations.length}
        emptyMessage={t('memberService.adminEmpty')}
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {directory.data?.organizations.map((organization) => {
            const name = organization.localizations.find((item) => item.locale === 'ko')?.displayName
              || organization.localizations[0]?.officialName
              || organization.sourceRecordKey;
            const eligible = canPublish(organization);
            return (
              <Card key={organization.id} className="flex h-full flex-col">
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <Badge variant={organization.publicApproved ? 'default' : 'secondary'}>
                      {organization.publicApproved ? t('koreaChina.public') : t('koreaChina.private')}
                    </Badge>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    <Link
                      href={`/korea-china-organizations/${organization.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {name}
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {memberServiceCategoryLabel(organization.organizationType, language)}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {organization.summaryKo || t('memberService.noSummary')}
                  </p>
                  {!eligible && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-amber-700">
                      <ShieldAlert className="h-4 w-4" />
                      {t('koreaChina.verificationRequired')}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={organization.publicApproved}
                        disabled={visibility.isPending || (!organization.publicApproved && !eligible)}
                        onCheckedChange={(visible) => visibility.mutate({ id: organization.id, visible })}
                        aria-label={`${name} ${t('koreaChina.visibility')}`}
                      />
                      <span className="text-sm">{t('koreaChina.visibility')}</span>
                    </div>
                    {organization.websiteUrl && (
                      <Button asChild variant="ghost" size="sm">
                        <a href={organization.websiteUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </QueryState>

      <AdminListPagination
        page={directory.data?.page ?? page}
        totalPages={directory.data?.totalPages ?? 0}
        onPageChange={setPage}
        testId="pagination-korea-china-organizations"
      />
    </TabsContent>
  );
}