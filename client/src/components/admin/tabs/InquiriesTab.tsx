import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { InquiryDetailView } from '@/components/InquiryDetailView';
import type { InquiryWithReplies } from '@shared/schema';
import { useAdminInquiries } from '@/hooks/useAdminData';
import { QueryState } from '@/components/QueryState';
import { AdminFilterBar } from '../AdminFilterBar';
import { AdminListPagination } from '../AdminListPagination';

export function InquiriesTab({ activeTab }: { activeTab: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryWithReplies | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filterInput, setFilterInput] = useState({ category: '', status: '' });
  const [filters, setFilters] = useState({ search: '', category: '', status: '' });

  const inquiriesQuery = useAdminInquiries(activeTab, page, filters);
  const { data: inquiriesData } = inquiriesQuery;
  useEffect(() => {
    if (inquiriesData && inquiriesData.totalPages > 0 && page > inquiriesData.totalPages) setPage(inquiriesData.totalPages);
  }, [inquiriesData, page]);
  const applyFilters = () => {
    setPage(1);
    setFilters({ ...filterInput, search: searchInput.trim() });
  };
  const resetFilters = () => {
    setSearchInput('');
    setFilterInput({ category: '', status: '' });
    setFilters({ search: '', category: '', status: '' });
    setPage(1);
  };

  return (
    <TabsContent value="inquiries" className="space-y-6">
      <h2 className="text-2xl font-bold">문의 관리</h2>
      <AdminFilterBar
        scope="inquiries"
        search={searchInput}
        onSearchChange={setSearchInput}
        onApply={applyFilters}
        onReset={resetFilters}
        searchLabel="문의 검색"
        searchPlaceholder="제목, 문의자, 회사명, 이메일 또는 내용 검색"
        total={inquiriesData?.total}
        filters={[
          { name: 'category', label: '분류', value: filterInput.category || 'all', onChange: (v) => setFilterInput((f) => ({ ...f, category: v === 'all' ? '' : v })), testId: 'select-inquiry-category-filter', options: [{ value: 'all', label: '전체 분류' }, { value: 'membership', label: '회원' }, { value: 'event', label: '행사' }, { value: 'partnership', label: '파트너십' }, { value: 'other', label: '기타' }] },
          { name: 'status', label: '처리 상태', value: filterInput.status || 'all', onChange: (v) => setFilterInput((f) => ({ ...f, status: v === 'all' ? '' : v })), testId: 'select-inquiry-status-filter', options: [{ value: 'all', label: '전체 상태' }, { value: 'new', label: '신규' }, { value: 'pending', label: '대기' }, { value: 'in_progress', label: '처리 중' }, { value: 'resolved', label: '해결' }, { value: 'closed', label: '종료' }] },
        ]}
      />
      <QueryState
        isLoading={inquiriesQuery.isLoading}
        isError={inquiriesQuery.isError}
        onRetry={() => inquiriesQuery.refetch()}
        empty={!inquiriesData?.inquiries?.length}
        emptyMessage="문의가 없습니다."
      >
      <div className="space-y-4">
        {inquiriesData?.inquiries?.map((inquiry: InquiryWithReplies) => (
          <div key={inquiry.id} className="p-4 border rounded flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-medium">{inquiry.subject}</h4>
              <p className="text-sm text-muted-foreground">{inquiry.name} • {inquiry.email}</p>
              <p className="text-sm mt-2 line-clamp-2">{inquiry.message}</p>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedInquiry(inquiry);
                  setViewDialogOpen(true);
                }}
                data-testid={`button-view-inquiry-${inquiry.id}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (confirm('정말 이 문의를 삭제하시겠습니까?')) {
                      try {
                        const response = await apiRequest('DELETE', `/api/inquiries/${inquiry.id}`, null);
                        if (response.ok) {
                          toast({ title: "문의가 삭제되었습니다" });
                          queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
                        }
                      } catch (error) {
                        toast({ title: "삭제 실패", variant: "destructive" });
                      }
                    }
                  }}
                  data-testid={`button-delete-inquiry-${inquiry.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      </QueryState>
      <AdminListPagination page={inquiriesData?.page || page} totalPages={inquiriesData?.totalPages || 0} onPageChange={setPage} testId="pagination-inquiries" />

      {selectedInquiry && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <InquiryDetailView inquiryId={selectedInquiry.id} onClose={() => setViewDialogOpen(false)} />
        </Dialog>
      )}
    </TabsContent>
  );
}
