import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowRight, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QueryState } from '@/components/QueryState';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchJson, queryKeys } from '@/lib/queryClient';
import { t } from '@/lib/i18n';

type PublicOrganization = {
  id: string;
  name: string;
  alternateNames: string[];
  summary: string | null;
  organizationType: string;
  websiteUrl: string | null;
  contactUrl: string | null;
  referenceUrl: string | null;
  verification: {
    status: string;
  };
};

type DirectoryResponse = {
  organizations: PublicOrganization[];
  categories: string[];
  total: number;
};

function OrganizationTable({ organizations }: { organizations: PublicOrganization[] }) {
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
              const link = organization.websiteUrl || organization.referenceUrl;
              return (
                <tr
                  key={organization.id}
                  className={`border-b border-border/70 align-top transition-colors hover:bg-primary/[0.035] ${
                    index % 2 === 1 ? 'bg-muted/30' : 'bg-card'
                  }`}
                >
                  <td className="px-5 py-5">
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {organization.organizationType}
                    </Badge>
                  </td>
                  <td className="px-5 py-5">
                    <Link
                      href={`/directory/${organization.id}`}
                      className="group inline-flex items-start font-semibold leading-6 text-foreground hover:text-primary"
                    >
                      {organization.name}
                      <ArrowRight className="ml-1.5 mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      {organization.verification.status === 'verified_register'
                        ? t('memberService.verifiedRegister')
                        : t('memberService.verifiedOfficial')}
                    </div>
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
                      <div>
                        <p className="text-muted-foreground">{t('koreaChina.noWebsite')}</p>
                        {link && (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center font-medium text-primary hover:underline"
                          >
                            {t('koreaChina.viewReference')}
                            <ExternalLink className="ml-1.5 h-4 w-4" aria-hidden="true" />
                          </a>
                        )}
                      </div>
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
                  <SelectItem key={item} value={item}>{item}</SelectItem>
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
          <OrganizationTable organizations={query.data?.organizations ?? []} />
        </QueryState>
      </section>
    </div>
  );
}