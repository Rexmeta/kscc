import { useState } from 'react';
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

export function InquiriesTab({ activeTab }: { activeTab: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryWithReplies | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const inquiriesQuery = useAdminInquiries(activeTab);
  const { data: inquiriesData } = inquiriesQuery;

  return (
    <TabsContent value="inquiries" className="space-y-6">
      <h2 className="text-2xl font-bold">문의 관리</h2>
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

      {selectedInquiry && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <InquiryDetailView inquiryId={selectedInquiry.id} onClose={() => setViewDialogOpen(false)} />
        </Dialog>
      )}
    </TabsContent>
  );
}
