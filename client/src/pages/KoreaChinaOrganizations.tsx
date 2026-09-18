import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QueryState } from '@/components/QueryState';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchJson, queryKeys } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

const CATEGORY_LABELS: Record<string, Record<Language, string>> = {
  '경제': { ko: '경제', en: 'Economy', zh: '经济' },
  '경제/민관': { ko: '경제/민관', en: 'Economy / Public-Private', zh: '经济／政企合作' },
  '경제·문화·교육': { ko: '경제·문화·교육', en: 'Economy, Culture & Education', zh: '经济、文化与教育' },
  '교육': { ko: '교육', en: 'Education', zh: '教育' },
  '기업': { ko: '기업', en: 'Business', zh: '企业' },
  '문화': { ko: '문화', en: 'Culture', zh: '文化' },
  '법률/학술': { ko: '법률/학술', en: 'Law / Academia', zh: '法律／学术' },
  '산업': { ko: '산업', en: 'Industry', zh: '产业' },
  '연구·문화': { ko: '연구·문화', en: 'Research & Culture', zh: '研究与文化' },
  '연합 네트워크': { ko: '연합 네트워크', en: 'Federation Network', zh: '联合网络' },
  '우호/외교': { ko: '우호/외교', en: 'Friendship / Diplomacy', zh: '友好／外交' },
  '종합교류': { ko: '종합교류', en: 'Comprehensive Exchange', zh: '综合交流' },
  '중국계 상회': { ko: '중국계 상회', en: 'Chinese Chamber', zh: '在韩中华商会' },
  '지역 특화 상회': { ko: '지역 특화 상회', en: 'Regional Chamber', zh: '地区专业商会' },
  '지역정부': { ko: '지역정부', en: 'Local Government', zh: '地方政府' },
  '화교·화인': { ko: '화교·화인', en: 'Overseas Chinese', zh: '华侨华人' },
};

function categoryLabel(category: string, language: Language) {
  return CATEGORY_LABELS[category]?.[language] ?? category;
}

type PublicOrganization = {
  id: string;
  name: string;
  alternateNames: string[];
  summary: string | null;
  organizationType: string;
  websiteUrl: string | null;
  contactUrl: string | null;
};

type DirectoryResponse = {
  organizations: PublicOrganization[];
  categories: string[];
  total: number;
};

function OrganizationTable({
  organizations,
  language,
}: {
  organizations: PublicOrganization[];
  language: Language;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-primary text-primary-foreground">
              <th className="w-[15%] px-5 py-4 text-sm font-semibold">{t('koreaChina.tableCategory')}</th>
              <th className="w-[24%] px-5 py-4 text-sm font-semibold">{t('koreaChina.tableOrganization')}</th>
              <th className="w-[41%] px-5 py-4 text-sm font-semibold">{t('koreaChina.tableRole')}</th>
              <th className="w-[20%] px-5 py-4 text-sm font-semibold">{t('koreaChina.tableLink')}</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((organization, index) => {
              return (
                <tr
                  key={organization.id}
                  className={`border-b border-border/70 align-top transition-colors hover:bg-primary/[0.035] ${
                    index % 2 === 1 ? 'bg-muted/30' : 'bg-card'
                  }`}
                >
                  <td className="px-5 py-5">
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {categoryLabel(organization.organizationType, language)}
                    </Badge>
                  </td>
                  <td className="px-5 py-5">
                    <span className="font-semibold leading-6 text-foreground">{organization.name}</span>
                  </td>
                  <td className="px-5 py-5 text-sm leading-6 text-muted-foreground">
                    {organization.summary || t('memberService.noSummary')}
                  </td>
                  <td className="px-5 py-5 text-sm">
                    {organization.websiteUrl ? (
                      <a
                        href={organization.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center font-medium text-primary hover:underline"
                      >
                        {t('koreaChina.viewWebsite')}
                        <ExternalLink className="ml-1.5 h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : (
                      <span
                        className="inline-flex cursor-not-allowed items-center rounded-md bg-muted px-3 py-2 text-muted-foreground"
                        aria-disabled="true"
                      >
                        {t('koreaChina.noWebsite')}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground md:hidden">
        {t('koreaChina.tableScrollHint')}
      </p>
    </div>
  );
}

export default function KoreaChinaOrganizationsPage() {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [category, setCategory] = useState('all');

  const query = useQuery({
    queryKey: queryKeys.memberService.directory({
      q: submittedSearch,
      organizationType: category,
      language,
      limit: 50,
    }),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ language, page: '1', limit: '50' });
      if (submittedSearch) params.set('q', submittedSearch);
      if (category !== 'all') params.set('organizationType', category);
      return fetchJson<DirectoryResponse>(`/api/member-service/v1/directory?${params}`, { signal });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border/70 bg-muted/40">
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="container relative py-14 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">KSCC NETWORK GUIDE</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">{t('koreaChina.title')}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
            {t('koreaChina.subtitle')}
          </p>
          <form
            className="mt-8 grid max-w-4xl gap-3 md:grid-cols-[1fr_15rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedSearch(search.trim());
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('memberService.searchPlaceholder')}
                className="h-11 pl-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11" aria-label={t('koreaChina.categories')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('koreaChina.allCategories')}</SelectItem>
                {query.data?.categories.map((item) => (
                  <SelectItem key={item} value={item}>{categoryLabel(item, language)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" className="h-11 px-6">{t('memberService.search')}</Button>
          </form>
        </div>
      </section>

      <section className="container py-10 md:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">{t('koreaChina.categories')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('koreaChina.intro')}</p>
          </div>
          {query.data && (
            <p className="text-sm text-muted-foreground">
              {t('koreaChina.resultCount')} {query.data.total}
            </p>
          )}
        </div>

        <QueryState
          isLoading={query.isLoading}
          isError={query.isError}
          onRetry={() => query.refetch()}
          empty={!query.data?.organizations.length}
          emptyMessage={t('koreaChina.empty')}
        >
          <OrganizationTable organizations={query.data?.organizations ?? []} language={language} />
        </QueryState>
      </section>
    </div>
  );
}