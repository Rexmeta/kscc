import { useEffect, useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminConsentEvidenceAccessLog } from '@/hooks/useAdminData';
import { QueryState } from '@/components/QueryState';
import { AdminFilterBar } from '../AdminFilterBar';
import { AdminListPagination } from '../AdminListPagination';
import type { ConsentEvidenceAccessLogEntry } from '@shared/schema';

const subjectTypeLabels = {
  account: '계정',
  inquiry: '문의',
} as const;

const actionLabels = {
  view: '조회',
  export: '내보내기',
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
        <h2 className="text-2xl font-bold">동의 증적 접근 이력</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          동의 증적을 조회하거나 내보낸 관리자와 대상 참조만 표시합니다.
        </p>
      </div>

      <AdminFilterBar
        scope="consent-evidence-access-log"
        search={subjectIdInput}
        onSearchChange={setSubjectIdInput}
        onApply={applyFilters}
        onReset={resetFilters}
        searchLabel="대상 참조"
        searchPlaceholder="계정 또는 문의 UUID"
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
              { value: 'account', label: '계정' },
              { value: 'inquiry', label: '문의' },
            ],
          },
          {
            name: 'action',
            label: '동작',
            value: actionInput || 'all',
            onChange: (value) => setActionInput(value === 'all' ? '' : value),
            testId: 'select-consent-evidence-action-filter',
            options: [
              { value: 'all', label: '전체 동작' },
              { value: 'view', label: '조회' },
              { value: 'export', label: '내보내기' },
            ],
          },
        ]}
      />

      <QueryState
        isLoading={accessLogQuery.isLoading}
        isError={accessLogQuery.isError}
        onRetry={() => accessLogQuery.refetch()}
        empty={!data?.entries?.length}
        emptyMessage="동의 증적 접근 이력이 없습니다."
        loadingMessage="접근 이력을 불러오는 중..."
      >
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>관리자 참조</TableHead>
                <TableHead>대상 유형</TableHead>
                <TableHead>대상 참조</TableHead>
                <TableHead>동작</TableHead>
                <TableHead>접근 시각</TableHead>
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