import { useEffect, useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Edit } from 'lucide-react';
import PageEditModal from '@/components/PageEditModal';
import type { PostWithTranslations } from '@shared/schema';
import { useAdminPageTranslationHistory, useAdminPosts } from '@/hooks/useAdminData';
import { QueryState } from '@/components/QueryState';
import { AdminFilterBar } from '../AdminFilterBar';
import { AdminListPagination } from '../AdminListPagination';

export function PagesTab({ activeTab, canEdit }: { activeTab: string; canEdit: boolean }) {
  const [selectedPage, setSelectedPage] = useState<PostWithTranslations | null>(null);
  const [pageEditModalOpen, setPageEditModalOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filterInput, setFilterInput] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '' });

  const pagesQuery = useAdminPosts('page', activeTab, page, filters);
  const historyQuery = useAdminPageTranslationHistory(activeTab, historyPage);
  const { data: pagesData } = pagesQuery;
  const { data: historyData } = historyQuery;
  useEffect(() => {
    if (pagesData && pagesData.totalPages > 0 && page > pagesData.totalPages) setPage(pagesData.totalPages);
  }, [pagesData, page]);
  const applyFilters = () => {
    setPage(1);
    setFilters({ search: searchInput.trim(), status: filterInput });
  };
  const resetFilters = () => {
    setSearchInput('');
    setFilterInput('');
    setFilters({ search: '', status: '' });
    setPage(1);
  };
  const localeLabels = { ko: '한국어', en: '영어', zh: '중국어' } as const;
  const formatDateTime = (value: Date | string) => {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime())
      ? '알 수 없음'
      : date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <TabsContent value="pages" className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">페이지 관리</h2>
      </div>
      <AdminFilterBar
        scope="pages"
        search={searchInput}
        onSearchChange={setSearchInput}
        onApply={applyFilters}
        onReset={resetFilters}
        searchLabel="페이지 검색"
        searchPlaceholder="페이지 제목 또는 설명 검색"
        total={pagesData?.total}
        filters={[{
          name: 'status',
          label: '게시 상태',
          value: filterInput || 'all',
          onChange: (value) => setFilterInput(value === 'all' ? '' : value),
          testId: 'select-page-status-filter',
          options: [{ value: 'all', label: '전체 상태' }, { value: 'draft', label: '임시저장' }, { value: 'published', label: '게시됨' }, { value: 'archived', label: '보관' }],
        }]}
      />

      <QueryState
        isLoading={pagesQuery.isLoading}
        isError={pagesQuery.isError}
        onRetry={() => pagesQuery.refetch()}
        empty={!pagesData?.posts?.length}
        emptyMessage="페이지가 없습니다."
      >
      <div className="border rounded-lg overflow-hidden">
        <div className="divide-y">
          {pagesData?.posts?.map((page: PostWithTranslations) => {
            const translation = page.translations?.find(t => t.locale === 'ko') || page.translations?.[0];
            return (
               <div
                 key={page.id}
                 className="p-4 flex items-center justify-between"
                 data-testid={page.slug === 'home' ? 'page-row-home' : `page-row-${page.id}`}
               >
                <div className="flex-1">
                   <h4 className="font-medium">
                     {page.slug === 'home' ? '홈 화면' : (translation?.title || page.slug)}
                   </h4>
                  <p className="text-sm text-muted-foreground">
                     {page.slug === 'home' ? '/' : `/${page.slug}`} • {page.status}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {translation?.excerpt || '페이지 설명 없음'}
                  </p>
                </div>
                 {canEdit && (
                   <div className="flex space-x-2">
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => {
                         setSelectedPage(page);
                         setPageEditModalOpen(true);
                       }}
                        data-testid={page.slug === 'home' ? 'button-edit-page-home' : `button-edit-page-${page.id}`}
                     >
                       <Edit className="h-4 w-4" />
                     </Button>
                   </div>
                 )}
              </div>
            );
          })}
          {(!pagesData?.posts || pagesData.posts.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              페이지가 없습니다
            </div>
          )}
        </div>
      </div>
      </QueryState>
      <AdminListPagination page={pagesData?.page || page} totalPages={pagesData?.totalPages || 0} onPageChange={setPage} testId="pagination-pages" />

      <Card>
        <CardHeader>
          <CardTitle>페이지 번역 변경 이력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <QueryState
            isLoading={historyQuery.isLoading}
            isError={historyQuery.isError}
            onRetry={() => historyQuery.refetch()}
            empty={!historyData?.history.length}
            emptyMessage="아직 저장된 변경 이력이 없습니다."
          >
            {historyData && historyData.history.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>페이지</TableHead>
                        <TableHead>언어</TableHead>
                        <TableHead>변경 담당자</TableHead>
                        <TableHead>변경 일시</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.history.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">/{entry.postSlug}</TableCell>
                          <TableCell>{localeLabels[entry.locale]}</TableCell>
                          <TableCell>{entry.changedByName || '알 수 없음'}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDateTime(entry.changedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {historyData.totalPages > 1 && (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      {historyData.page} / {historyData.totalPages} 페이지 · 총 {historyData.total}건
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage <= 1}
                        onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                        aria-label="이전 페이지 변경 이력"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        이전
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage >= historyData.totalPages}
                        onClick={() => setHistoryPage((page) => Math.min(historyData.totalPages, page + 1))}
                        aria-label="다음 페이지 변경 이력"
                      >
                        다음
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </QueryState>
        </CardContent>
      </Card>

      {selectedPage && (
        <PageEditModal
          isOpen={pageEditModalOpen}
          onClose={() => {
            setPageEditModalOpen(false);
            setSelectedPage(null);
          }}
          page={selectedPage}
        />
      )}
    </TabsContent>
  );
}
