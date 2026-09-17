import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QueryState } from '@/components/QueryState';
import { fetchJson, queryKeys } from '@/lib/queryClient';
import { t } from '@/lib/i18n';

type ReviewOrganization = {
  id: string;
  sourceRecordKey: string;
  organizationType: string;
  baseCountry: string;
  baseRegion: string | null;
  chinaRegionFocus: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
  verificationStatus: string;
  lastVerifiedAt: string | null;
  reviewNote: string | null;
  localizations: Array<{
    locale: string;
    officialName: string;
    displayName: string | null;
  }>;
};

type ReviewQueueResponse = {
  organizations: ReviewOrganization[];
  total: number;
  page: number;
  totalPages: number;
};

type ReviewAuditsResponse = {
  audits: Array<{
    id: string;
    organizationId: string;
    sourceRecordKey: string;
    organizationName: string | null;
    decision: string;
    reviewerId: string | null;
    reviewerName: string | null;
    evidenceUrl: string | null;
    verificationDate: string | null;
    note: string | null;
    createdAt: string;
  }>;
  page: number;
  totalPages: number;
};

export default function MemberServiceOperatorPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [verificationDate, setVerificationDate] = useState('');
  const [note, setNote] = useState('');
  const [auditPage, setAuditPage] = useState(1);

  const bootstrap = useQuery({
    queryKey: queryKeys.memberService.bootstrap(),
    queryFn: ({ signal }) => fetchJson<{ flags: { operator: boolean } }>(
      '/api/member-service/v1/bootstrap',
      { signal },
    ),
  });
  const queue = useQuery({
    queryKey: queryKeys.memberService.reviewQueue(),
    queryFn: ({ signal }) => fetchJson<ReviewQueueResponse>(
      '/api/member-service/v1/operator/review-queue?page=1&limit=25',
      { signal },
    ),
    enabled: Boolean(bootstrap.data?.flags.operator),
  });
  const selected = queue.data?.organizations.find((organization) => organization.id === selectedId)
    ?? queue.data?.organizations[0]
    ?? null;
  const audits = useQuery({
    queryKey: queryKeys.memberService.reviewAudits(auditPage, 25),
    queryFn: ({ signal }) => fetchJson<ReviewAuditsResponse>(
      `/api/member-service/v1/operator/review-audits?page=${auditPage}&limit=25`,
      { signal },
    ),
    enabled: Boolean(bootstrap.data?.flags.operator),
  });

  useEffect(() => {
    if (!selected && queue.data?.organizations[0]) {
      setSelectedId(queue.data.organizations[0].id);
    }
  }, [queue.data?.organizations, selected]);

  useEffect(() => {
    if (!selected) return;
    setEvidenceUrl(selected.sourceUrl || '');
    setVerificationDate(selected.lastVerifiedAt?.slice(0, 10) || '');
    setNote(selected.reviewNote || '');
  }, [selected?.id]);

  const review = useMutation({
    mutationFn: async (decision: 'approve' | 'limit' | 'reject') => {
      if (!selected) throw new Error('No organization selected');
      return fetchJson<{ publicApproved: boolean }>(
        `/api/member-service/v1/operator/organizations/${selected.id}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision,
            evidenceUrl: evidenceUrl.trim() || undefined,
            verificationDate: verificationDate || undefined,
            note: note.trim() || undefined,
          }),
        },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberService.reviewQueue() });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.memberService.reviewAudits(auditPage, 25),
      });
    },
  });

  if (bootstrap.isLoading) {
    return (
      <QueryState isLoading isError={false} onRetry={() => bootstrap.refetch()} empty={false} emptyMessage="">
        <div />
      </QueryState>
    );
  }
  if (!bootstrap.data?.flags.operator) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-3xl font-bold">{t('memberService.operatorTitle')}</h1>
        <p className="mt-4 text-muted-foreground">{t('memberService.operatorDisabled')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border/70 bg-muted/40">
        <div className="container py-10 md:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">KSCC Member Service</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">{t('memberService.operatorTitle')}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t('memberService.operatorSubtitle')}</p>
        </div>
      </section>
      <section className="container grid gap-6 py-8 lg:grid-cols-[22rem_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t('memberService.operatorQueue')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <QueryState
              isLoading={queue.isLoading}
              isError={queue.isError}
              onRetry={() => queue.refetch()}
              empty={!queue.data?.organizations.length}
              emptyMessage={t('memberService.operatorEmpty')}
            >
              <div className="divide-y">
                {queue.data?.organizations.map((organization) => {
                  const name = organization.localizations.find((row) => row.locale === 'ko')?.displayName
                    || organization.localizations[0]?.officialName
                    || organization.sourceRecordKey;
                  return (
                    <button
                      key={organization.id}
                      type="button"
                      className={`w-full px-5 py-4 text-left transition-colors hover:bg-muted/60 ${selected?.id === organization.id ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedId(organization.id)}
                    >
                      <p className="font-medium">{name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {organization.organizationType} · {organization.baseCountry}
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">{organization.verificationStatus}</Badge>
                    </button>
                  );
                })}
              </div>
            </QueryState>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selected && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle>
                      {selected.localizations.find((row) => row.locale === 'ko')?.displayName
                        || selected.localizations[0]?.officialName
                        || selected.sourceRecordKey}
                    </CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selected.sourceRecordKey} · {selected.organizationType} · {selected.baseCountry}
                    </p>
                  </div>
                  <Badge variant="secondary"><ShieldCheck className="mr-1 h-3.5 w-3.5" />{selected.verificationStatus}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    {t('memberService.operatorEvidence')}
                    <Input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://..." />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    {t('memberService.operatorVerificationDate')}
                    <Input type="date" value={verificationDate} onChange={(event) => setVerificationDate(event.target.value)} />
                  </label>
                </div>
                <label className="block space-y-2 text-sm font-medium">
                  {t('memberService.operatorNote')}
                  <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => review.mutate('approve')} disabled={review.isPending}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />{t('memberService.operatorApprove')}
                  </Button>
                  <Button variant="outline" onClick={() => review.mutate('limit')} disabled={review.isPending}>
                    <AlertTriangle className="mr-2 h-4 w-4" />{t('memberService.operatorLimit')}
                  </Button>
                  <Button variant="destructive" onClick={() => review.mutate('reject')} disabled={review.isPending}>
                    <XCircle className="mr-2 h-4 w-4" />{t('memberService.operatorReject')}
                  </Button>
                </div>
                {review.isSuccess && <p className="text-sm text-green-700">{t('memberService.operatorSaved')}</p>}
                {review.isError && <p className="text-sm text-destructive">{t('common.error')}</p>}
              </CardContent>
            </Card>
          )}

            <Card>
              <CardHeader><CardTitle>{t('memberService.operatorHistory')}</CardTitle></CardHeader>
              <CardContent>
                <QueryState
                  isLoading={audits.isLoading}
                  isError={audits.isError}
                  onRetry={() => audits.refetch()}
                  empty={!audits.data?.audits.length}
                  emptyMessage={t('memberService.operatorHistoryEmpty')}
                >
                  <div className="space-y-4">
                    {audits.data?.audits.map((audit) => (
                      <article key={audit.id} className="rounded-lg border p-4">
                        <div className="mb-4">
                          <p className="font-medium">
                            {audit.organizationName || audit.sourceRecordKey}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {audit.sourceRecordKey}
                          </p>
                        </div>
                        <div className="grid gap-4 text-sm md:grid-cols-2">
                          <div>
                            <p className="font-medium">{t('memberService.operatorDecision')}</p>
                            <Badge variant="secondary" className="mt-1">{audit.decision}</Badge>
                          </div>
                          <div>
                            <p className="font-medium">{t('memberService.operatorReviewer')}</p>
                            <p className="mt-1 text-muted-foreground">
                              {audit.reviewerName || audit.reviewerId || t('memberService.operatorUnknownReviewer')}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">{t('memberService.operatorEvidence')}</p>
                            {audit.evidenceUrl ? (
                              <a
                                className="mt-1 block break-all text-primary underline underline-offset-2"
                                href={audit.evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {audit.evidenceUrl}
                              </a>
                            ) : (
                              <p className="mt-1 text-muted-foreground">{t('memberService.operatorNotProvided')}</p>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{t('memberService.operatorVerificationDate')}</p>
                            <p className="mt-1 text-muted-foreground">
                              {audit.verificationDate
                                ? new Date(audit.verificationDate).toLocaleDateString()
                                : t('memberService.operatorNotProvided')}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="font-medium">{t('memberService.operatorNote')}</p>
                            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                              {audit.note || t('memberService.operatorNotProvided')}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="font-medium">{t('memberService.operatorTimestamp')}</p>
                            <time className="mt-1 block text-muted-foreground" dateTime={audit.createdAt}>
                              {new Date(audit.createdAt).toLocaleString()}
                            </time>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {audits.data && audits.data.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPage((page) => Math.max(1, page - 1))}
                        disabled={auditPage <= 1}
                      >
                        {t('memberService.operatorPrevious')}
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {t('memberService.operatorPageOf')} {audits.data.page} {t('common.of')} {audits.data.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPage((page) => Math.min(audits.data?.totalPages ?? page, page + 1))}
                        disabled={auditPage >= audits.data.totalPages}
                      >
                        {t('memberService.operatorNext')}
                      </Button>
                    </div>
                  )}
                </QueryState>
              </CardContent>
            </Card>
        </div>
      </section>
    </div>
  );
}