import { useEffect, useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminConsentEvidenceAccessLog } from '@/hooks/useAdminData';
import { QueryState } from '@/components/QueryState';
import { AdminFilterBar } from '../AdminFilterBar';
import { AdminListPagination } from '../AdminListPagination';
import type { ConsentEvidenceAccessLogEntry } from '@shared/schema';

const subjectTypeLabels = {
  account: '회원',
  inquiry: '문의',
} as const;

const actionLabels = {
  view: '확인',
  export: 'CSV 다운로드',
} as const;

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? '알 수 없음'
    : date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ConsentEvidenceAccessLogTab({ activeTab }: { activeTab: string }) {
  const [page, setPage] = useState(1);
  const [subjectIdInput, setSubjectIdInput] = useState('');
  const [subjectTypeInput, setSubjectTypeInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [filters, setFilters] = useState({
    subjectId: '',
    subjectType: '',
    action: '',
  });

  const accessLogQuery = useAdminConsentEvidenceAccessLog(activeTab, page, filters);
  const { data } = accessLogQuery;

  useEffect(() => {
    if (data && data.totalPages > 0 && page > data.totalPages) {
      setPage(data.totalPages);
    }
  }, [data, page]);

  const applyFilters = () => {
    setPage(1);
    setFilters({
      subjectId: subjectIdInput.trim(),
      subjectType: subjectTypeInput,
      action: actionInput,
    });
  };

  const resetFilters = () => {
    setSubjectIdInput('');
    setSubjectTypeInput('');
    setActionInput('');
    setFilters({ subjectId: '', subjectType: '', action: '' });
    setPage(1);
  };

  return (
    <TabsContent value="consent-evidence-access-log" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">동의 기록 확인 및 다운로드 내역</h2>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>
            회원 또는 문의자가 약관·개인정보 처리방침에 동의한 목적, 정책 버전, 동의 시각을 확인하는 기록입니다.
          </p>
          <p>
            회원 관리와 문의 관리의 ‘동의 기록 보기’에서 기록을 확인하거나 CSV로 다운로드하면 이 목록에 남습니다.
          </p>
        </div>
      </div>

      <AdminFilterBar
        scope="consent-evidence-access-log"
        search={subjectIdInput}
        onSearchChange={setSubjectIdInput}
        onApply={applyFilters}
        onReset={resetFilters}
        searchLabel="대상 ID"
        searchPlaceholder="회원 또는 문의 대상 ID 검색"
        searchTestId="input-search-consent-evidence-access-log"
        total={data?.total}
        filters={[
          {
            name: 'subjectType',
            label: '대상 유형',
            value: subjectTypeInput || 'all',
            onChange: (value) => setSubjectTypeInput(value === 'all' ? '' : value),
            testId: 'select-consent-evidence-subject-type-filter',
            options: [
              { value: 'all', label: '전체 대상' },
              { value: 'account', label: '회원' },
              { value: 'inquiry', label: '문의' },
            ],
          },
          {
            name: 'action',
            label: '작업',
            value: actionInput || 'all',
            onChange: (value) => setActionInput(value === 'all' ? '' : value),
            testId: 'select-consent-evidence-action-filter',
            options: [
              { value: 'all', label: '전체 작업' },
              { value: 'view', label: '확인' },
              { value: 'export', label: 'CSV 다운로드' },
            ],
          },
        ]}
      />

      <QueryState
        isLoading={accessLogQuery.isLoading}
        isError={accessLogQuery.isError}
        onRetry={() => accessLogQuery.refetch()}
        empty={!data?.entries?.length}
        emptyMessage="동의 기록 확인·다운로드 내역이 없습니다."
        loadingMessage="동의 기록 내역을 불러오는 중..."
      >
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>관리자 ID</TableHead>
                <TableHead>대상 유형</TableHead>
                <TableHead>대상 ID</TableHead>
                <TableHead>작업</TableHead>
                <TableHead>작업 시각</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.entries.map((entry: ConsentEvidenceAccessLogEntry, index) => (
                <TableRow key={`${entry.adminUserId ?? 'deleted'}-${entry.subjectType}-${entry.subjectId}-${entry.accessedAt}-${index}`}>
                  <TableCell className="font-mono text-xs">{entry.adminUserId || '삭제된 관리자'}</TableCell>
                  <TableCell>{subjectTypeLabels[entry.subjectType as keyof typeof subjectTypeLabels] || entry.subjectType}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.subjectId}</TableCell>
                  <TableCell>{actionLabels[entry.action as keyof typeof actionLabels] || entry.action}</TableCell>
                  <TableCell>{formatDateTime(entry.accessedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <AdminListPagination
          page={data?.page || page}
          totalPages={data?.totalPages || 0}
          onPageChange={setPage}
          testId="pagination-consent-evidence-access-log"
        />
      </QueryState>
    </TabsContent>
  );
}