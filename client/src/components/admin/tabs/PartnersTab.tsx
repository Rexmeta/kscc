import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Partner } from '@shared/schema';
import { useAdminPartners } from '@/hooks/useAdminData';
import { PartnerDialog } from '../forms/PartnerDialog';
import { AdminListPagination } from '../AdminListPagination';

export function PartnersTab({ activeTab }: { activeTab: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data: partnersData, isLoading, isError, refetch } = useAdminPartners(activeTab, page);
  const [selectedPartner, setSelectedPartner] = useState<Partner>();
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();

  useEffect(() => {
    if (partnersData && partnersData.totalPages > 0 && page > partnersData.totalPages) {
      setPage(partnersData.totalPages);
    }
  }, [partnersData, page]);

  const invalidatePartners = () => {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === '/api/partners',
    });
  };

  const deletePartner = async (partner: Partner) => {
    if (!confirm(`"${partner.name}" 파트너를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    setDeletingId(partner.id);
    try {
      await apiRequest('DELETE', `/api/partners/${partner.id}`);
      toast({ title: '파트너가 삭제되었습니다' });
      invalidatePartners();
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(undefined);
    }
  };

  return (
    <TabsContent value="partners" className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-2xl font-bold">파트너 관리</h2>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-partner">
          <Plus className="h-4 w-4 mr-2" />
          파트너 추가
        </Button>
      </div>

      <PartnerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={invalidatePartners}
      />
      {selectedPartner && (
        <PartnerDialog
          partner={selectedPartner}
          open
          onOpenChange={(open) => { if (!open) setSelectedPartner(undefined); }}
          onSuccess={invalidatePartners}
        />
      )}

      {isLoading && (
        <div className="p-8 text-center text-muted-foreground">파트너 목록을 불러오는 중...</div>
      )}
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>파트너 목록을 불러오지 못했습니다.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>다시 시도</Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && (
        <div className="border rounded-lg overflow-hidden">
          <div className="divide-y">
            {partnersData?.partners.map((partner: Partner) => (
              <div
                key={partner.id}
                className={`p-4 flex items-center justify-between gap-4 ${partner.isActive ? '' : 'opacity-70 bg-muted/30'}`}
              >
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="w-16 h-16 object-contain rounded border shrink-0"
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{partner.name}</h4>
                      <Badge variant={partner.isActive ? 'default' : 'secondary'}>
                        {partner.isActive ? '활성' : '비활성'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{partner.category}</p>
                    {partner.website && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {partner.website}
                        </a>
                      </p>
                    )}
                    {partner.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{partner.description}</p>}
                  </div>
                </div>
                <div className="flex space-x-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedPartner(partner)}
                    aria-label={`${partner.name} 수정`}
                    data-testid={`button-edit-partner-${partner.id}`}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">수정</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletePartner(partner)}
                    disabled={deletingId === partner.id}
                    aria-label={`${partner.name} 삭제`}
                    data-testid={`button-delete-partner-${partner.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">삭제</span>
                  </Button>
                </div>
              </div>
            ))}
            {partnersData?.partners.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">파트너가 없습니다</div>
            )}
          </div>
        </div>
      )}
      <AdminListPagination
        page={partnersData?.page || page}
        totalPages={partnersData?.totalPages || 0}
        onPageChange={setPage}
        testId="pagination-partners"
      />
    </TabsContent>
  );
}