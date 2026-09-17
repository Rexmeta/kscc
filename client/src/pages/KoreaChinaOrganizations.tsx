import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowRight, Building2, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  verification: {
    status: string;
  };
};

type DirectoryResponse = {
  organizations: PublicOrganization[];
  categories: string[];
  total: number;
};

function OrganizationCard({ organization }: { organization: PublicOrganization }) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border/70 bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_48px_hsl(var(--primary)/0.12)]">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-accent" />
      <CardContent className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <Badge variant="secondary">{organization.organizationType}</Badge>
        </div>
        <h3 className="mt-5 text-xl font-semibold leading-tight">{organization.name}</h3>
        <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
          {organization.summary || t('memberService.noSummary')}
        </p>
        <div className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {organization.verification.status === 'verified_register'
            ? t('memberService.verifiedRegister')
            : t('memberService.verifiedOfficial')}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/directory/${organization.id}`}>
              {t('common.more')}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          {organization.websiteUrl ? (
            <Button asChild size="sm">
              <a href={organization.websiteUrl} target="_blank" rel="noopener noreferrer">
                {t('koreaChina.viewWebsite')}
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="secondary" disabled>
              {t('koreaChina.noWebsite')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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

  const grouped = useMemo(() => {
    const groups = new Map<string, PublicOrganization[]>();
    for (const organization of query.data?.organizations ?? []) {
      const items = groups.get(organization.organizationType) ?? [];
      items.push(organization);
      groups.set(organization.organizationType, items);
    }
    return Array.from(groups.entries());
  }, [query.data?.organizations]);

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
          <div className="space-y-12">
            {grouped.map(([group, organizations]) => (
              <section key={group}>
                <div className="mb-5 flex items-center gap-3">
                  <h2 className="text-xl font-semibold md:text-2xl">{group}</h2>
                  <Badge variant="outline">{organizations.length}</Badge>
                </div>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {organizations.map((organization) => (
                    <OrganizationCard key={organization.id} organization={organization} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </QueryState>
      </section>
    </div>
  );
}