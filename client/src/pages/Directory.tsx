import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { ArrowLeft, Building2, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QueryState } from '@/components/QueryState';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchJson, queryKeys } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

type DirectoryOrganization = {
  id: string;
  name: string;
  alternateNames: string[];
  summary: string | null;
  organizationType: string;
  baseCountry: string;
  baseRegion: string | null;
  chinaRegionFocus: string | null;
  websiteUrl: string | null;
  contactUrl: string | null;
  verification: {
    status: string;
    lastVerifiedAt: string | null;
    nextReviewAt: string | null;
  };
  services: Array<{
    code: string;
    nameKo: string;
    nameEn: string | null;
    nameZh: string | null;
  }>;
  regions: Array<{
    code: string;
    countryCode: string;
    nameKo: string;
    nameEn: string | null;
    nameZh: string | null;
    relationScope: string;
  }>;
};

type DirectoryResponse = {
  organizations: DirectoryOrganization[];
  total: number;
  page: number;
  totalPages: number;
};

function localizedLabel(
  value: { nameKo: string; nameEn: string | null; nameZh: string | null },
  language: Language,
) {
  if (language === 'en') return value.nameEn || value.nameKo;
  if (language === 'zh') return value.nameZh || value.nameKo;
  return value.nameKo;
}

function verificationLabel(status: string) {
  return status === 'verified_register'
    ? t('memberService.verifiedRegister')
    : t('memberService.verifiedOfficial');
}

function OrganizationCard({
  organization,
  language,
}: {
  organization: DirectoryOrganization;
  language: Language;
}) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border/70 bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_48px_hsl(var(--primary)/0.12)]">
      <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-accent" />
      <CardContent className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {verificationLabel(organization.verification.status)}
          </Badge>
        </div>
        <h2 className="mt-5 text-xl font-semibold leading-tight">{organization.name}</h2>
        {organization.alternateNames.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {organization.alternateNames.slice(0, 2).join(' · ')}
          </p>
        )}
        <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">
          {organization.summary || t('memberService.noSummary')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {organization.baseRegion && <span>{organization.baseRegion}</span>}
          {organization.chinaRegionFocus && <span>· {organization.chinaRegionFocus}</span>}
        </div>
        <div className="mt-auto pt-6">
          <Button asChild variant="outline" className="w-full justify-between">
            <Link href={`/directory/${organization.id}`}>
              <span>{t('common.more')}</span>
              <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OrganizationDetail({
  organization,
  language,
}: {
  organization: DirectoryOrganization;
  language: Language;
}) {
  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border/70 bg-muted/40">
        <div className="container py-10 md:py-16">
          <Link href="/directory" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('memberService.backToDirectory')}
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  {verificationLabel(organization.verification.status)}
                </Badge>
                <Badge variant="secondary">{organization.organizationType}</Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{organization.name}</h1>
            </div>
            {organization.websiteUrl && (
              <Button asChild>
                <a href={organization.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('memberService.website')}
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>
      <section className="container grid gap-8 py-10 md:grid-cols-[1fr_20rem] md:py-16">
        <div>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground">
            {organization.summary || t('memberService.noSummary')}
          </p>
          {organization.services.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-semibold">{t('memberService.services')}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {organization.services.map((service) => (
                  <Badge key={service.code} variant="secondary">
                    {localizedLabel(service, language)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {organization.regions.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">{t('memberService.regions')}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {organization.regions.map((region) => (
                  <Badge key={`${region.code}-${region.relationScope}`} variant="outline">
                    {localizedLabel(region, language)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <Card className="h-fit bg-muted/30">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('memberService.reviewNote')}</p>
              <p className="mt-2 text-sm font-medium">{verificationLabel(organization.verification.status)}</p>
            </div>
            {organization.contactUrl && (
              <Button asChild variant="outline" className="w-full">
                <a href={organization.contactUrl} target="_blank" rel="noopener noreferrer">
                  {t('memberService.contact')}
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default function DirectoryPage() {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [, params] = useRoute('/directory/:id');
  const detailId = params?.id;

  const bootstrap = useQuery({
    queryKey: queryKeys.memberService.bootstrap(),
    queryFn: ({ signal }) => fetchJson<{ flags: { directory: boolean } }>(
      '/api/member-service/v1/bootstrap',
      { signal },
    ),
    staleTime: 5 * 60 * 1000,
  });

  const detail = useQuery({
    queryKey: queryKeys.memberService.organization(detailId || '', language),
    queryFn: ({ signal }) => fetchJson<DirectoryOrganization>(
      `/api/member-service/v1/directory/${detailId}?lang=${language}`,
      { signal },
    ),
    enabled: Boolean(detailId && bootstrap.data?.flags.directory),
  });

  const list = useQuery({
    queryKey: queryKeys.memberService.directory({ q: submittedSearch, language, page: 1, limit: 12 }),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ language, page: '1', limit: '12' });
      if (submittedSearch) params.set('q', submittedSearch);
      return fetchJson<DirectoryResponse>(`/api/member-service/v1/directory?${params}`, { signal });
    },
    enabled: Boolean(!detailId && bootstrap.data?.flags.directory),
  });

  if (bootstrap.isLoading) {
    return (
      <QueryState
        isLoading
        isError={false}
        onRetry={() => bootstrap.refetch()}
        empty={false}
        emptyMessage=""
      >
        <div />
      </QueryState>
    );
  }

  if (!bootstrap.data?.flags.directory) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-3xl font-bold">{t('memberService.title')}</h1>
        <p className="mt-4 text-muted-foreground">{t('memberService.disabled')}</p>
      </div>
    );
  }

  if (detailId) {
    return (
      <QueryState
        isLoading={detail.isLoading}
        isError={detail.isError}
        onRetry={() => detail.refetch()}
        empty={!detail.data}
        emptyMessage={t('memberService.empty')}
      >
        {detail.data ? <OrganizationDetail organization={detail.data} language={language} /> : null}
      </QueryState>
    );
  }

  const organizations = list.data?.organizations ?? [];
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border/70 bg-muted/40">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="container relative py-12 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">KSCC Member Service</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">{t('memberService.title')}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {t('memberService.subtitle')}
          </p>
          <form
            className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedSearch(search.trim());
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('memberService.searchPlaceholder')}
                className="h-11 pl-10"
                aria-label={t('memberService.searchPlaceholder')}
              />
            </div>
            <Button type="submit" className="h-11 px-6">{t('memberService.search')}</Button>
          </form>
        </div>
      </section>
      <section className="container py-10 md:py-16">
        <p className="mb-6 text-sm text-muted-foreground">{t('memberService.reviewNote')}</p>
        <QueryState
          isLoading={list.isLoading}
          isError={list.isError}
          onRetry={() => list.refetch()}
          empty={organizations.length === 0}
          emptyMessage={t('memberService.empty')}
        >
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((organization) => (
              <OrganizationCard key={organization.id} organization={organization} language={language} />
            ))}
          </div>
        </QueryState>
      </section>
    </div>
  );
}