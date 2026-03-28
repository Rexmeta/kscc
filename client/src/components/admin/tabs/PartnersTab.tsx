import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import type { Partner } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAdminPartners } from '@/hooks/useAdminData';

export function PartnersTab({ activeTab }: { activeTab: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: partnersData } = useAdminPartners(activeTab);

  return (
    <TabsContent value="partners" className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">파트너 관리</h2>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="divide-y">
          {partnersData?.map((partner: Partner) => (
            <div key={partner.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {partner.logo && (
                  <img src={partner.logo} alt={partner.name} className="w-16 h-16 object-contain rounded border" onError={(e) => e.currentTarget.style.display = 'none'} />
                )}
                <div>
                  <h4 className="font-medium">{partner.name}</h4>
                  <p className="text-sm text-muted-foreground">{partner.category}</p>
                  {partner.website && <p className="text-xs text-muted-foreground mt-1"><a href={partner.website} target="_blank" className="text-blue-600 hover:underline">{partner.website}</a></p>}
                  {partner.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{partner.description}</p>}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid={`button-edit-partner-${partner.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (confirm('정말 이 파트너를 삭제하시겠습니까?')) {
                      try {
                        const response = await apiRequest('DELETE', `/api/partners/${partner.id}`, null);
                        if (response.ok) {
                          toast({ title: "파트너가 삭제되었습니다" });
                          queryClient.invalidateQueries({ queryKey: ['/api/partners'] });
                        }
                      } catch (error) {
                        toast({ title: "삭제 실패", variant: "destructive" });
                      }
                    }
                  }}
                  data-testid={`button-delete-partner-${partner.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {(!partnersData || partnersData.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              파트너가 없습니다
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
