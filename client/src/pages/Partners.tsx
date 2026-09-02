import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Building2, ExternalLink, Handshake, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PagePagination } from '@/components/PagePagination';
import { QueryState } from '@/components/QueryState';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { fetchJson, queryKeys } from '@/lib/queryClient';
import type { Partner } from '@shared/schema';

type PublicPartnersResponse = {
  partners: Partner[];
  total: number;
  page: number;
  totalPages: number;
};

const PAGE_SIZE = 12;

function getLocalizedName(partner: Partner, language: 'ko' | 'en' | 'zh') {
  if (language === 'en') return partner.nameEn || partner.name;
  if (language === 'zh') return partner.nameZh || partner.name;
  return partner.name;
}

function getLocalizedDescription(partner: Partner, language: 'ko' | 'en' | 'zh') {
  if (language === 'en') return partner.descriptionEn || partner.description || '';
  if (language === 'zh') return partner.descriptionZh || partner.description || '';
  return partner.description || '';
}

function categoryLabel(category: string) {
  if (category === 'sponsor') return t('partners.category.sponsor');
  if (category === 'government') return t('partners.category.government');
  return t('partners.category.partner');
}

function PartnerCard({ partner, language }: { partner: Partner; language: 'ko' | 'en' | 'zh' }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const name = getLocalizedName(partner, language);
  const description = getLocalizedDescription(partner, language);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-border/70 bg-card shadow-[0_12px_40px_hsl(var(--primary)/0.06)] transition-transform duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_48px_hsl(var(--primary)/0.12)]">
      <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-accent opacity-80" />
      <CardContent className="flex flex-1 flex-col p-6">
        <div className="mb-7 flex min-h-[92px] items-center justify-between gap-4">
          <div className="flex h-[92px] w-[150px] items-center justify-center rounded-xl border border-border/60 bg-muted/40 p-4">
            {partner.logo && !logoFailed ? (
              <img
                src={partner.logo}
                alt={name}
                className="max-h-16 w-full object-contain"
                width={240}
                height={104}
                loading="lazy"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-primary/70" aria-label={name}>
                <Building2 className="h-8 w-8" aria-hidden="true" />
                <span className="max-w-[120px] text-center text-[11px] font-semibold leading-tight text-muted-foreground">
                  {name}
                </span>
              </div>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 border-primary/20 bg-primary/5 text-[11px] font-medium text-primary">
            {categoryLabel(partner.category)}
          </Badge>
        </div>

        <h2 className="text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground">{name}</h2>
        {description ? (
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : (
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{t('partners.fallbackDescription')}</p>
        )}

        <div className="mt-auto pt-6">
          {partner.website ? (
            <Button asChild variant="outline" className="w-full justify-between border-primary/20 bg-background/70 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground">
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} — ${t('partners.visitWebsite')}`}
                data-testid={`partner-website-${partner.id}`}
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {t('partners.visitWebsite')}
                </span>
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <div className="flex items-center gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary/70" aria-hidden="true" />
              {t('partners.websiteUnavailable')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PartnersPage() {
  const { language } = useLanguage();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.partners.list({ page, limit: PAGE_SIZE }),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      return fetchJson<PublicPartnersResponse>(`/api/partners?${params.toString()}`, { signal });
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const partners = data?.partners ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border/70 bg-muted/40">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-[-5rem] h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="container relative py-8 sm:py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary sm:mb-6">
              <Handshake className="h-4 w-4" aria-hidden="true" />
              {t('partners.eyebrow')}
            </div>
            <h1 className="max-w-2xl text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl md:text-6xl">
              {t('partners.title')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-6 sm:text-base md:text-lg">
              {t('partners.subtitle')}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground sm:mt-8 sm:gap-y-3 sm:text-sm">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                {t('partners.trustNote')}
              </span>
              {total > 0 && (
                <span className="font-medium text-foreground">
                  {total.toLocaleString(language === 'ko' ? 'ko-KR' : language === 'zh' ? 'zh-CN' : 'en-US')} {t('partners.directoryCount')}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          empty={partners.length === 0}
          emptyMessage={t('partners.empty')}
          loadingMessage={t('partners.loading')}
        >
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner) => (
                <PartnerCard key={partner.id} partner={partner} language={language} />
              ))}
            </div>
            <PagePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              testIdPrefix="button-partners-page"
            />
          </>
        </QueryState>
      </section>
    </div>
  );
}