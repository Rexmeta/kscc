import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { ArrowLeft, Building2, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QueryState } from '@/components/QueryState';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
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

type AdminOrganization = {
  id: string;
  sourceSystem: string;
  sourceRecordKey: string;
  organizationType: string;
  legalForm: string | null;
  supervisingAuthority: string | null;
  scope: string | null;
  baseCountry: string;
  baseRegion: string | null;
  chinaRegionFocus: string | null;
  primaryDomain: string | null;
  summaryKo: string | null;
  websiteUrl: string | null;
  contactUrl: string | null;
  verificationStatus: string;
  sourceType: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  nextReviewAt: string | null;
  reviewNote: string | null;
  isActive: boolean;
  publicApproved: boolean;
  createdAt: string;
  updatedAt: string;
  localizations: Array<{
    id: string;
    locale: string;
    officialName: string;
    displayName: string | null;
    summary: string | null;
    isOfficial: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  services: Array<Record<string, unknown> & {
    code: string;
    nameKo: string;
    nameEn: string | null;
    nameZh: string | null;
    isApproved: boolean;
    rawValue: string | null;
  }>;
  regions: Array<Record<string, unknown> & {
    code: string;
    countryCode: string;
    nameKo: string;
    nameEn: string | null;
    nameZh: string | null;
    relationScope: string;
    isApproved: boolean;
    rawValue: string | null;
  }>;
  contacts: Array<{
    id: string;
    contactType: string;
    label: string | null;
    value: string;
    isPublic: boolean;
    verifiedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  latestImport: {
    id: string;
    sourceRecordKey: string;
    rawData: unknown;
    status: string;
    reasonCodes: unknown;
    createdAt: string;
    batch: {
      id: string;
      sourceSystem: string;
      sourceFileName: string | null;
      sourceFileHash: string | null;
      status: string;
      importedBy: string | null;
      createdAt: string;
      completedAt: string | null;
    } | null;
  } | null;
  reviewAudits: Array<{
    id: string;
    reviewerId: string | null;
    reviewerName: string | null;
    decision: string;
    evidenceUrl: string | null;
    verificationDate: string | null;
    publicApproved: boolean;
    note: string | null;
    beforeState: unknown;
    afterState: unknown;
    correlationId: string | null;
    createdAt: string;
  }>;
};

type AdminDirectoryResponse = {
  organizations: AdminOrganization[];
  total: number;
  page: number;
  limit: number;
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

function adminVerificationLabel(status: string) {
  if (status === 'verified_official' || status === 'verified_register') {
    return verificationLabel(status);
  }
  if (status === 'limited') return t('memberService.adminStatusLimited');
  if (status === 'rejected') return t('memberService.adminStatusRejected');
  if (status === 'needs_review') return t('memberService.adminStatusPending');
  return status || t('memberService.adminStatusUnknown');
}

function AdminStatusBadges({ organization }: { organization: AdminOrganization }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={organization.publicApproved ? 'default' : 'secondary'}>
        {organization.publicApproved
          ? t('memberService.adminStatusApproved')
          : organization.verificationStatus === 'limited'
            ? t('memberService.adminStatusLimited')
            : organization.verificationStatus === 'rejected'
              ? t('memberService.adminStatusRejected')
              : t('memberService.adminStatusPending')}
      </Badge>
      <Badge variant={organization.isActive ? 'outline' : 'destructive'}>
        {organization.isActive ? t('memberService.adminActive') : t('memberService.adminInactive')}
      </Badge>
      <Badge variant="outline">{adminVerificationLabel(organization.verificationStatus)}</Badge>
    </div>
  );
}

function AdminOrganizationCard({
  organization,
}: {
  organization: AdminOrganization;
}) {
  const name = organization.localizations.find((row) => row.locale === 'ko')?.displayName
    || organization.localizations[0]?.displayName
    || organization.localizations[0]?.officialName
    || organization.sourceRecordKey;
  return (
    <Card className="flex h-full flex-col border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <AdminStatusBadges organization={organization} />
        </div>
        <h2 className="mt-5 text-xl font-semibold leading-tight">{name}</h2>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
          {organization.summaryKo || t('memberService.noSummary')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{organization.organizationType}</span>
          {organization.baseRegion && <span>· {organization.baseRegion}</span>}
          <span>· {organization.sourceRecordKey}</span>
        </div>
        <div className="mt-auto pt-6">
          <Button asChild variant="outline" className="w-full justify-between">
             <Link href={`/korea-china-organizations/${organization.id}`}>
              <span>{t('common.more')}</span>
              <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminValue({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/60 p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">
        {value === null || value === undefined || value === '' ? '—' : String(value)}
      </dd>
    </div>
  );
}

function AdminJsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md bg-muted/60 p-3 text-xs leading-5">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function AdminOrganizationDetail({
  organization,
}: {
  organization: AdminOrganization;
}) {
  const date = (value: string | null) => value ? new Date(value).toLocaleString() : '—';
  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-amber-500/30 bg-amber-500/5">
        <div className="container py-10 md:py-14">
           <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('memberService.backToDirectory')}
          </Link>
          <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                {t('memberService.adminBadge')}
              </Badge>
              <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
                {organization.localizations.find((row) => row.locale === 'ko')?.displayName
                  || organization.localizations[0]?.displayName
                  || organization.localizations[0]?.officialName
                  || organization.sourceRecordKey}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{organization.sourceRecordKey}</p>
            </div>
            <AdminStatusBadges organization={organization} />
          </div>
        </div>
      </section>
      <section className="container space-y-8 py-10 md:py-14">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">{t('memberService.adminDetails')}</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AdminValue label="ID" value={organization.id} />
              <AdminValue label="Source system" value={organization.sourceSystem} />
              <AdminValue label="Source record key" value={organization.sourceRecordKey} />
              <AdminValue label="Organization type" value={organization.organizationType} />
              <AdminValue label="Legal form" value={organization.legalForm} />
              <AdminValue label="Supervising authority" value={organization.supervisingAuthority} />
              <AdminValue label="Scope" value={organization.scope} />
              <AdminValue label="Base country" value={organization.baseCountry} />
              <AdminValue label="Base region" value={organization.baseRegion} />
              <AdminValue label="China region focus" value={organization.chinaRegionFocus} />
              <AdminValue label="Primary domain" value={organization.primaryDomain} />
              <AdminValue label="Website URL" value={organization.websiteUrl} />
              <AdminValue label="Contact URL" value={organization.contactUrl} />
              <AdminValue label="Source type" value={organization.sourceType} />
              <AdminValue label="Source URL" value={organization.sourceUrl} />
              <AdminValue label="Verification status" value={adminVerificationLabel(organization.verificationStatus)} />
              <AdminValue label="Public approval" value={organization.publicApproved ? t('memberService.adminPublic') : t('memberService.adminPrivate')} />
              <AdminValue label="Active status" value={organization.isActive ? t('memberService.adminActive') : t('memberService.adminInactive')} />
              <AdminValue label="Last verified" value={date(organization.lastVerifiedAt)} />
              <AdminValue label="Next review" value={date(organization.nextReviewAt)} />
              <AdminValue label="Created" value={date(organization.createdAt)} />
              <AdminValue label="Updated" value={date(organization.updatedAt)} />
              <AdminValue label="Review note" value={organization.reviewNote} />
            </dl>
            {organization.summaryKo && (
              <div className="mt-4">
                <AdminValue label="Korean summary" value={organization.summaryKo} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">{t('memberService.adminLocalizations')}</h2>
            <div className="mt-4 space-y-4">
              {organization.localizations.map((localization) => (
                <div key={localization.id} className="rounded-md border border-border/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{localization.locale}</Badge>
                    {localization.isOfficial && <Badge variant="outline">Official</Badge>}
                  </div>
                  <p className="mt-3 font-medium">{localization.officialName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{localization.displayName || '—'}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{localization.summary || '—'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">{t('memberService.services')}</h2>
              <div className="mt-4 space-y-3">
                {organization.services.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
                {organization.services.map((service) => (
                  <div key={String(service.id)} className="rounded-md border border-border/60 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{service.code}</Badge>
                      <Badge variant={service.isApproved ? 'default' : 'outline'}>
                        {service.isApproved ? t('memberService.adminPublic') : t('memberService.adminPrivate')}
                      </Badge>
                    </div>
                    <p className="mt-2">{service.nameKo}</p>
                    <p className="text-muted-foreground">{service.rawValue || '—'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">{t('memberService.regions')}</h2>
              <div className="mt-4 space-y-3">
                {organization.regions.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
                {organization.regions.map((region) => (
                  <div key={String(region.id)} className="rounded-md border border-border/60 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{region.code}</Badge>
                      <Badge variant="outline">{region.relationScope}</Badge>
                      {!region.isApproved && <Badge variant="destructive">{t('memberService.adminPrivate')}</Badge>}
                    </div>
                    <p className="mt-2">{region.nameKo}</p>
                    <p className="text-muted-foreground">{region.rawValue || '—'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">{t('memberService.adminContacts')}</h2>
            {organization.contacts.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{t('memberService.adminNoContacts')}</p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {organization.contacts.map((contact) => (
                  <div key={contact.id} className="rounded-md border border-border/60 p-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{contact.contactType}</Badge>
                      <Badge variant="outline">
                        {contact.isPublic ? t('memberService.adminPublic') : t('memberService.adminPrivate')}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium">{contact.label || '—'}</p>
                    <p className="break-all text-sm">{contact.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{date(contact.verifiedAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">{t('memberService.adminImport')}</h2>
            {!organization.latestImport ? (
              <p className="mt-4 text-sm text-muted-foreground">{t('memberService.adminNoImport')}</p>
            ) : (
              <div className="mt-4 space-y-4">
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <AdminValue label="Import status" value={organization.latestImport.status} />
                  <AdminValue label="Source record key" value={organization.latestImport.sourceRecordKey} />
                  <AdminValue label="Imported at" value={date(organization.latestImport.createdAt)} />
                  <AdminValue label="Batch source" value={organization.latestImport.batch?.sourceSystem} />
                  <AdminValue label="Source file" value={organization.latestImport.batch?.sourceFileName} />
                  <AdminValue label="Batch status" value={organization.latestImport.batch?.status} />
                </dl>
                <div>
                  <p className="mb-2 text-sm font-medium">{t('memberService.operatorRawData')}</p>
                  <AdminJsonBlock value={organization.latestImport.rawData} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">{t('memberService.operatorReasonCodes')}</p>
                  <AdminJsonBlock value={organization.latestImport.reasonCodes} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">{t('memberService.adminReviewHistory')}</h2>
            {organization.reviewAudits.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{t('memberService.adminNoHistory')}</p>
            ) : (
              <div className="mt-4 space-y-4">
                {organization.reviewAudits.map((audit) => (
                  <div key={audit.id} className="rounded-md border border-border/60 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{audit.decision}</Badge>
                      <Badge variant="outline">
                        {audit.publicApproved ? t('memberService.adminPublic') : t('memberService.adminPrivate')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{date(audit.createdAt)}</span>
                    </div>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      <AdminValue label="Reviewer" value={audit.reviewerName || audit.reviewerId} />
                      <AdminValue label="Verification date" value={date(audit.verificationDate)} />
                      <AdminValue label="Evidence URL" value={audit.evidenceUrl} />
                      <AdminValue label="Correlation ID" value={audit.correlationId} />
                    </dl>
                    {audit.note && <p className="mt-3 whitespace-pre-wrap text-sm">{audit.note}</p>}
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Before</p>
                        <AdminJsonBlock value={audit.beforeState} />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">After</p>
                        <AdminJsonBlock value={audit.afterState} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
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
            <Link href={`/korea-china-organizations/${organization.id}`}>
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
  connectionsEnabled,
}: {
  organization: DirectoryOrganization;
  language: Language;
  connectionsEnabled: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const connectionMutation = useMutation({
    mutationFn: async () => {
      const draft = await fetchJson<{ connection: { id: string } }>(
        '/api/member-service/v1/connections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: organization.id,
            requestType: 'directory_connection',
            purpose,
            language,
            disclosureScope: {
              kscc: true,
              targetOrganization: true,
              contactDetails: false,
            },
          }),
        },
      );
      return fetchJson(
        `/api/member-service/v1/connections/${draft.connection.id}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idempotencyKey: `directory-${draft.connection.id}`,
            disclosureScope: {
              kscc: true,
              targetOrganization: true,
              contactDetails: false,
            },
            consent: {
              accepted: true,
              policyVersion: 'member-service-connection-v1',
            },
          }),
        },
      );
    },
    onSuccess: () => {
      setShowConnectionForm(false);
      setPurpose('');
      setConsentAccepted(false);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border/70 bg-muted/40">
        <div className="container py-10 md:py-16">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
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
          <div className="mt-8 max-w-xl">
            {connectionsEnabled && isAuthenticated && (
              <Button
                type="button"
                onClick={() => setShowConnectionForm((visible) => !visible)}
                variant={showConnectionForm ? 'outline' : 'default'}
                disabled={!isAuthenticated}
              >
                {t('memberService.requestConnection')}
              </Button>
            )}
            {connectionsEnabled && !isAuthenticated && (
              <Button asChild variant="outline">
                <Link href="/login">{t('memberService.loginToConnect')}</Link>
              </Button>
            )}
            {showConnectionForm && (
              <Card className="mt-4 border-primary/20 bg-card">
                <CardContent className="space-y-4 p-5">
                  <div>
                    <h2 className="font-semibold">{t('memberService.connectionTitle')}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('memberService.connectionDescription')}
                    </p>
                  </div>
                  <Textarea
                    value={purpose}
                    onChange={(event) => setPurpose(event.target.value)}
                    placeholder={t('memberService.connectionPurpose')}
                    aria-label={t('memberService.connectionPurpose')}
                    maxLength={2000}
                    rows={4}
                  />
                  <label className="flex items-start gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(event) => setConsentAccepted(event.target.checked)}
                      className="mt-1"
                    />
                    <span>{t('memberService.connectionConsent')}</span>
                  </label>
                  {connectionMutation.isError && (
                    <p className="text-sm text-destructive">{t('memberService.connectionError')}</p>
                  )}
                  {connectionMutation.isSuccess && (
                    <p className="text-sm text-primary">{t('memberService.connectionSuccess')}</p>
                  )}
                  <Button
                    type="button"
                    onClick={() => connectionMutation.mutate()}
                    disabled={!purpose.trim() || !consentAccepted || connectionMutation.isPending}
                  >
                    {connectionMutation.isPending
                      ? t('memberService.connectionSubmitting')
                      : t('memberService.connectionSubmit')}
                  </Button>
                </CardContent>
              </Card>
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
  const { isAdmin, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const [, params] = useRoute('/korea-china-organizations/:id');
  const detailId = params?.id;

  const bootstrap = useQuery({
    queryKey: queryKeys.memberService.bootstrap(),
    queryFn: ({ signal }) => fetchJson<{ flags: { directory: boolean; connections: boolean } }>(
      '/api/member-service/v1/bootstrap',
      { signal },
    ),
    staleTime: 5 * 60 * 1000,
  });

  const adminDetail = useQuery({
    queryKey: queryKeys.memberService.adminOrganization(detailId || ''),
    queryFn: ({ signal }) => fetchJson<AdminOrganization>(
      `/api/member-service/v1/admin/directory/${detailId}`,
      { signal },
    ),
    enabled: Boolean(detailId && bootstrap.data?.flags.directory && !authLoading && isAdmin),
  });

  const list = useQuery({
    queryKey: queryKeys.memberService.directory({ q: submittedSearch, language, page: 1, limit: 12 }),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ language, page: '1', limit: '12' });
      if (submittedSearch) params.set('q', submittedSearch);
      return fetchJson<DirectoryResponse>(`/api/member-service/v1/directory?${params}`, { signal });
    },
    enabled: Boolean(!detailId && bootstrap.data?.flags.directory && !authLoading && !isAdmin),
  });

  const adminList = useQuery({
    queryKey: queryKeys.memberService.adminDirectory({
      q: submittedSearch,
      language,
      page: adminPage,
      limit: 12,
    }),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        language,
        page: String(adminPage),
        limit: '12',
      });
      if (submittedSearch) params.set('q', submittedSearch);
      return fetchJson<AdminDirectoryResponse>(
        `/api/member-service/v1/admin/directory?${params}`,
        { signal },
      );
    },
    enabled: Boolean(!detailId && bootstrap.data?.flags.directory && !authLoading && isAdmin),
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
        isLoading={authLoading || adminDetail.isLoading}
        isError={!authLoading && adminDetail.isError}
        onRetry={() => adminDetail.refetch()}
        empty={!adminDetail.data}
        emptyMessage={t('memberService.empty')}
      >
        {adminDetail.data ? <AdminOrganizationDetail organization={adminDetail.data} /> : null}
      </QueryState>
    );
  }

  if (isAdmin) {
    const organizations = adminList.data?.organizations ?? [];
    const totalPages = adminList.data?.totalPages ?? 1;
    return (
      <div className="min-h-screen bg-background">
        <section className="relative overflow-hidden border-b border-amber-500/30 bg-amber-500/5">
          <div className="container relative py-12 md:py-20">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
              {t('memberService.adminBadge')}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">{t('memberService.title')}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {t('memberService.adminSubtitle')}
            </p>
            <form
              className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                setAdminPage(1);
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
          <p className="mb-6 text-sm text-muted-foreground">{t('memberService.adminSubtitle')}</p>
          <QueryState
            isLoading={authLoading || adminList.isLoading}
            isError={!authLoading && adminList.isError}
            onRetry={() => adminList.refetch()}
            empty={organizations.length === 0}
            emptyMessage={t('memberService.adminEmpty')}
          >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {organizations.map((organization) => (
                <AdminOrganizationCard key={organization.id} organization={organization} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3" aria-label={t('common.pagination')}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={adminPage <= 1 || adminList.isFetching}
                  onClick={() => setAdminPage((page) => Math.max(1, page - 1))}
                >
                  {t('memberService.adminPrevious')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('memberService.adminPageOf')} {adminPage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={adminPage >= totalPages || adminList.isFetching}
                  onClick={() => setAdminPage((page) => Math.min(totalPages, page + 1))}
                >
                  {t('memberService.adminNext')}
                </Button>
              </div>
            )}
          </QueryState>
        </section>
      </div>
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