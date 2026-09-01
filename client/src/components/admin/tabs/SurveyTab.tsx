import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { CalendarClock, Check, ChevronLeft, ChevronRight, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAdminSurvey, useAdminSurveyHistory } from '@/hooks/useAdminData';
import {
  getSurveyStatus,
  surveySettingsSchema,
  type SurveySettingsInput,
} from '@shared/survey';
import type { SurveySettings } from '@shared/schema';
import { QueryState } from '@/components/QueryState';

const defaultValues: SurveySettingsInput = {
  title: '',
  description: '',
  externalUrl: '',
  displayOrder: 0,
  isActive: false,
  startsAt: null,
  endsAt: null,
};

const historyPageSize = 10;
const statusLabels = {
  inactive: '비활성',
  upcoming: '예정',
  active: '진행 중',
  ended: '종료',
} as const;

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateTimeLocal(value: Date | string | null | undefined) {
  const date = asDate(value);
  if (!date) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value: Date | string | null | undefined) {
  const date = asDate(value);
  return date ? date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
}

function formatPeriod(startsAt: Date | string | null | undefined, endsAt: Date | string | null | undefined) {
  if (!startsAt || !endsAt) return '기간 없음';
  return `${formatDateTime(startsAt)} ~ ${formatDateTime(endsAt)}`;
}

function statusBadge(status: keyof typeof statusLabels) {
  const className = {
    inactive: 'bg-muted text-muted-foreground',
    upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    active: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
    ended: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  }[status];
  return <Badge className={className}>{statusLabels[status]}</Badge>;
}

function surveyFormValues(settings: SurveySettings): SurveySettingsInput {
  return {
    title: settings.title || '',
    description: settings.description || '',
    externalUrl: settings.externalUrl || '',
    displayOrder: settings.displayOrder ?? 0,
    isActive: settings.isActive,
    startsAt: settings.startsAt ? new Date(settings.startsAt) : null,
    endsAt: settings.endsAt ? new Date(settings.endsAt) : null,
  };
}

export function SurveyTab({ activeTab }: { activeTab: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [listPage, setListPage] = useState(1);
  const surveyQuery = useAdminSurvey(activeTab, listPage);
  const surveys = surveyQuery.data?.surveys || [];
  const [selectedId, setSelectedId] = useState<string>();
  const [historyPage, setHistoryPage] = useState(1);
  const [historySnapshotVersion, setHistorySnapshotVersion] = useState<number>();
  const selectedSurvey = surveys.find((survey) => survey.id === selectedId) || surveys[0];
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useAdminSurveyHistory(activeTab, selectedSurvey?.id, historyPage, historyPageSize, historySnapshotVersion);
  const form = useForm<SurveySettingsInput>({
    resolver: zodResolver(surveySettingsSchema),
    defaultValues,
  });

  useEffect(() => {
    if (selectedSurvey) {
      setSelectedId(selectedSurvey.id);
      form.reset(surveyFormValues(selectedSurvey));
      setHistoryPage(1);
      setHistorySnapshotVersion(undefined);
    }
  }, [selectedSurvey?.id]);

  const refreshSurveys = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/survey'] });
    queryClient.invalidateQueries({ queryKey: ['/api/survey'] });
    queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/survey', defaultValues);
      return response.json() as Promise<SurveySettings>;
    },
    onSuccess: (created) => {
      refreshSurveys();
      setSelectedId(created.id);
      toast({ title: '새 설문이 추가되었습니다.' });
    },
    onError: (error) => toast({
      title: '설문 추가 실패',
      description: error instanceof Error ? error.message : '설문 추가 중 오류가 발생했습니다.',
      variant: 'destructive',
    }),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SurveySettingsInput) => {
      if (!selectedSurvey) throw new Error('설문을 먼저 선택해주세요.');
      const response = await apiRequest('PUT', `/api/admin/survey/${selectedSurvey.id}`, data);
      return response.json() as Promise<SurveySettings>;
    },
    onSuccess: (savedSettings) => {
      form.reset(surveyFormValues(savedSettings));
      refreshSurveys();
      setHistoryPage(1);
      setHistorySnapshotVersion(undefined);
      toast({ title: '설문 설정이 저장되었습니다.' });
    },
    onError: (error) => toast({
      title: '설문 설정 저장 실패',
      description: error instanceof Error ? error.message : '설정 저장 중 오류가 발생했습니다.',
      variant: 'destructive',
    }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSurvey) throw new Error('설문을 먼저 선택해주세요.');
      const response = await apiRequest('DELETE', `/api/admin/survey/${selectedSurvey.id}`);
      return response.json() as Promise<SurveySettings>;
    },
    onSuccess: (savedSettings) => {
      form.reset(surveyFormValues(savedSettings));
      refreshSurveys();
      setHistorySnapshotVersion(undefined);
      toast({ title: '설문이 비활성화되었습니다.' });
    },
    onError: (error) => toast({
      title: '설문 비활성화 실패',
      description: error instanceof Error ? error.message : '설문 비활성화 중 오류가 발생했습니다.',
      variant: 'destructive',
    }),
  });

  return (
    <TabsContent value="survey" className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>회원 설문 관리</CardTitle>
                <CardDescription>로그인한 회원에게 표시할 외부 설문을 여러 개 관리합니다.</CardDescription>
              </div>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              data-testid="button-add-survey"
            >
              <Plus className="mr-2 h-4 w-4" />
              {createMutation.isPending ? '추가 중...' : '새 설문 추가'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={surveyQuery.isLoading}
            isError={surveyQuery.isError}
            onRetry={() => surveyQuery.refetch()}
            empty={surveys.length === 0}
            emptyMessage="등록된 설문이 없습니다. 새 설문을 추가해 주세요."
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" data-testid="survey-list">
              {surveys.map((survey) => (
                <button
                  key={survey.id}
                  type="button"
                  onClick={() => setSelectedId(survey.id)}
                  className={`rounded-lg border p-4 text-left transition-colors hover:border-primary ${
                    selectedSurvey?.id === survey.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  data-testid={`survey-item-${survey.id}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="line-clamp-2 font-semibold">{survey.title || '(제목 없음)'}</span>
                    {statusBadge(getSurveyStatus(survey))}
                  </div>
                  <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                    {survey.description || '소개 없음'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    순서 {survey.displayOrder} · {formatPeriod(survey.startsAt, survey.endsAt)}
                  </p>
                </button>
              ))}
            </div>
            {(surveyQuery.data?.totalPages || 0) > 1 && (
              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  {surveyQuery.data?.page} / {surveyQuery.data?.totalPages} 페이지 · 총 {surveyQuery.data?.total}건
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={listPage <= 1}
                    onClick={() => setListPage((page) => Math.max(1, page - 1))}
                    aria-label="이전 설문 목록 페이지"
                  >
                    <ChevronLeft className="h-4 w-4" />이전
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={listPage >= (surveyQuery.data?.totalPages || 1)}
                    onClick={() => setListPage((page) => Math.min(surveyQuery.data?.totalPages || 1, page + 1))}
                    aria-label="다음 설문 목록 페이지"
                  >
                    다음<ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>

      {selectedSurvey && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              설문 편집
            </CardTitle>
            <CardDescription>
              제목, 소개, HTTPS 링크, 기간, 노출 순서와 활성 상태를 설문별로 설정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="max-w-2xl space-y-5">
              <div>
                <label htmlFor="survey-title" className="form-label">설문 제목</label>
                <Input id="survey-title" {...form.register('title')} data-testid="input-survey-title" />
                {form.formState.errors.title && <p className="mt-1 text-sm text-destructive">{form.formState.errors.title.message}</p>}
              </div>
              <div>
                <label htmlFor="survey-description" className="form-label">간단한 소개</label>
                <Textarea id="survey-description" rows={4} {...form.register('description')} data-testid="textarea-survey-description" />
                {form.formState.errors.description && <p className="mt-1 text-sm text-destructive">{form.formState.errors.description.message}</p>}
              </div>
              <div>
                <label htmlFor="survey-url" className="form-label">외부 설문 링크</label>
                <Input id="survey-url" type="url" placeholder="https://forms.example.com/..." {...form.register('externalUrl')} data-testid="input-survey-url" />
                <p className="mt-1 text-xs text-muted-foreground">외부 설문 플랫폼의 HTTPS 링크만 입력할 수 있습니다.</p>
                {form.formState.errors.externalUrl && <p className="mt-1 text-sm text-destructive">{form.formState.errors.externalUrl.message}</p>}
              </div>
              <div>
                <label htmlFor="survey-order" className="form-label">노출 순서</label>
                <Input id="survey-order" type="number" min="0" max="10000" {...form.register('displayOrder', { valueAsNumber: true })} data-testid="input-survey-order" />
                {form.formState.errors.displayOrder && <p className="mt-1 text-sm text-destructive">{form.formState.errors.displayOrder.message}</p>}
              </div>
              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <p className="font-medium">설문 기간</p>
                  <p className="text-sm text-muted-foreground">기간을 입력할 때는 시작과 종료를 모두 입력해야 합니다.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="survey-starts-at" className="form-label">시작 일시</label>
                    <Controller
                      control={form.control}
                      name="startsAt"
                      render={({ field }) => (
                        <Input id="survey-starts-at" type="datetime-local" value={toDateTimeLocal(field.value)} onChange={(event) => field.onChange(event.target.value ? new Date(event.target.value) : null)} onBlur={field.onBlur} ref={field.ref} data-testid="input-survey-starts-at" />
                      )}
                    />
                    {form.formState.errors.startsAt && <p className="mt-1 text-sm text-destructive">{form.formState.errors.startsAt.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="survey-ends-at" className="form-label">종료 일시</label>
                    <Controller
                      control={form.control}
                      name="endsAt"
                      render={({ field }) => (
                        <Input id="survey-ends-at" type="datetime-local" value={toDateTimeLocal(field.value)} onChange={(event) => field.onChange(event.target.value ? new Date(event.target.value) : null)} onBlur={field.onBlur} ref={field.ref} data-testid="input-survey-ends-at" />
                      )}
                    />
                    {form.formState.errors.endsAt && <p className="mt-1 text-sm text-destructive">{form.formState.errors.endsAt.message}</p>}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">설문 노출</p>
                  <p className="text-sm text-muted-foreground">활성화하고 기간 안일 때 회원에게 표시됩니다.</p>
                </div>
                <Switch checked={form.watch('isActive')} onCheckedChange={(checked) => form.setValue('isActive', checked, { shouldValidate: true })} data-testid="switch-survey-active" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-survey">
                  <Check className="mr-2 h-4 w-4" />
                  {saveMutation.isPending ? '저장 중...' : '설정 저장'}
                </Button>
                {selectedSurvey.isActive && (
                  <Button type="button" variant="outline" disabled={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate()} data-testid="button-deactivate-survey">
                    <Trash2 className="mr-2 h-4 w-4" />
                    비활성화
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {selectedSurvey && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" />변경 이력</CardTitle>
            <CardDescription>선택한 설문의 변경 이력만 읽기 전용으로 표시합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <span className="text-sm font-medium">현재 상태</span>
              {statusBadge(getSurveyStatus(selectedSurvey))}
              <span className="text-sm text-muted-foreground">순서 {selectedSurvey.displayOrder}</span>
            </div>
            <QueryState isLoading={isHistoryLoading} isError={isHistoryError} onRetry={() => refetchHistory()} empty={!historyData?.history.length} emptyMessage="아직 저장된 변경 이력이 없습니다.">
              {historyData && historyData.history.length > 0 && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>버전</TableHead><TableHead>제목 / 링크</TableHead><TableHead>상태</TableHead>
                        <TableHead>순서 / 기간</TableHead><TableHead>변경 일시</TableHead><TableHead>변경 담당자</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.history.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">v{entry.version}</TableCell>
                          <TableCell className="min-w-[220px]">
                            <div className="font-medium">{entry.title || '(제목 없음)'}</div>
                            {entry.externalUrl ? <a href={entry.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block max-w-[260px] truncate text-xs text-primary hover:underline">{entry.externalUrl}</a> : <span className="text-xs text-muted-foreground">링크 없음</span>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{entry.isActive ? '활성' : '비활성'}</TableCell>
                          <TableCell className="min-w-[220px] text-sm">순서 {entry.displayOrder} · {formatPeriod(entry.startsAt, entry.endsAt)}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{formatDateTime(entry.changedAt)}</TableCell>
                          <TableCell className="whitespace-nowrap">{entry.changedByName || '알 수 없음'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {historyData.totalPages > 1 && (
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">{historyData.page} / {historyData.totalPages} 페이지 · 총 {historyData.total}건</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={historyPage <= 1} onClick={() => setHistoryPage((page) => Math.max(1, page - 1))} aria-label="이전 이력 페이지"><ChevronLeft className="h-4 w-4" />이전</Button>
                        <Button variant="outline" size="sm" disabled={historyPage >= historyData.totalPages} onClick={() => setHistoryPage((page) => Math.min(historyData.totalPages, page + 1))} aria-label="다음 이력 페이지">다음<ChevronRight className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </QueryState>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}