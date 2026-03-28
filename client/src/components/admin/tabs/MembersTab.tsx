import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Member } from '@shared/schema';
import { EditMemberForm } from '../forms/EditMemberForm';
import { useAdminMembers } from '@/hooks/useAdminData';

export function MembersTab({ activeTab }: { activeTab: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: membersData } = useAdminMembers(activeTab);

  return (
    <TabsContent value="members" className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">회원 관리</h2>
      </div>

      <div className="space-y-2">
        {membersData?.members?.map((member: Member) => (
          <div key={member.id} className="flex justify-between items-center p-4 border rounded">
            <div className="flex-1">
              <p className="font-medium">{member.companyName}</p>
              <p className="text-sm text-muted-foreground">{member.industry} • {member.country} {member.city}</p>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedMember(member);
                  setViewDialogOpen(true);
                }}
                data-testid={`button-view-member-${member.id}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedMember(member);
                  setEditDialogOpen(true);
                }}
                data-testid={`button-edit-member-${member.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (confirm('정말 이 회원을 삭제하시겠습니까?')) {
                    try {
                      const response = await apiRequest('DELETE', `/api/members/${member.id}`, null);
                      if (response.ok) {
                        toast({ title: "회원이 삭제되었습니다" });
                        queryClient.invalidateQueries({ queryKey: ['/api/members', { admin: true }] });
                      }
                    } catch (error) {
                      toast({ title: "삭제 실패", variant: "destructive" });
                    }
                  }
                }}
                data-testid={`button-delete-member-${member.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedMember && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMember.companyName} 상세 정보</DialogTitle>
              <DialogDescription>회원사 정보를 확인하고 관리할 수 있습니다</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedMember.logo && (
                <div className="flex justify-center">
                  <img src={selectedMember.logo} alt={selectedMember.companyName} className="h-20 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">회사명</p>
                  <p className="font-medium">{selectedMember.companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">업종</p>
                  <p className="font-medium">{selectedMember.industry}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">국가</p>
                  <p className="font-medium">{selectedMember.country}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">도시</p>
                  <p className="font-medium">{selectedMember.city}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">주소</p>
                  <p className="font-medium">{selectedMember.address}</p>
                </div>
                {selectedMember.website && (
                  <div>
                    <p className="text-sm text-muted-foreground">웹사이트</p>
                    <p className="font-medium"><a href={selectedMember.website} target="_blank" className="text-blue-600 hover:underline">{selectedMember.website}</a></p>
                  </div>
                )}
                {selectedMember.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">전화</p>
                    <p className="font-medium">{selectedMember.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">담당자</p>
                  <p className="font-medium">{selectedMember.contactPerson}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">담당자 이메일</p>
                  <p className="font-medium">{selectedMember.contactEmail}</p>
                </div>
                {selectedMember.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">설명</p>
                    <p className="font-medium whitespace-pre-wrap">{selectedMember.description}</p>
                  </div>
                )}
              </div>
              <Button onClick={() => {
                setViewDialogOpen(false);
                setEditDialogOpen(true);
              }} className="w-full">
                편집하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedMember && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMember.companyName} 편집</DialogTitle>
            </DialogHeader>
            <EditMemberForm
              member={selectedMember}
              onSuccess={() => {
                setEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/members', { admin: true }] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </TabsContent>
  );
}
