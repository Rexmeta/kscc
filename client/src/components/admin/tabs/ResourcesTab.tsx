import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { deletePost } from '@/lib/adminPostApi';
import type { PostWithTranslations } from '@shared/schema';
import { CreateResourceDialog } from '../forms/CreateResourceDialog';
import { EditResourceForm } from '../forms/EditResourceForm';
import { useAdminPosts } from '@/hooks/useAdminData';
import { PostPublicationToggle } from '../PostPublicationToggle';

interface ResourcesTabProps {
  activeTab: string;
  createResourceDialogOpen: boolean;
  setCreateResourceDialogOpen: (open: boolean) => void;
}

export function ResourcesTab({ activeTab, createResourceDialogOpen, setCreateResourceDialogOpen }: ResourcesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, hasPermission } = useAuth();
  const [selectedResource, setSelectedResource] = useState<PostWithTranslations | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: resourcesData } = useAdminPosts('resource', activeTab);
  const canCreate = isAdmin || hasPermission('resource.upload');
  const canUpdate = isAdmin || hasPermission('resource.update');
  const canPublish = isAdmin || hasPermission('resource.publish');
  const canDelete = isAdmin;

  const invalidate = () => queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/posts' });

  return (
    <TabsContent value="resources" className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">자료 관리</h2>
        {canCreate && (
          <>
            <Button onClick={() => setCreateResourceDialogOpen(true)} data-testid="button-create-resource">
              <Plus className="h-4 w-4 mr-1" />
              자료 생성
            </Button>
            <CreateResourceDialog
              onSuccess={invalidate}
              open={createResourceDialogOpen}
              onOpenChange={setCreateResourceDialogOpen}
            />
          </>
        )}
      </div>

      <div className="grid gap-4">
        {resourcesData?.posts?.map((resource: PostWithTranslations) => (
          <div key={resource.id} className="p-4 border rounded flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-medium mb-2">{resource.translations?.[0]?.title || '제목 없음'}</h4>
              <p className="text-sm text-muted-foreground mb-2">{resource.translations?.[0]?.excerpt || '설명 없음'}</p>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <Badge variant="outline">{(resource.tags as string[])?.[0] || '기타'}</Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <PostPublicationToggle
                post={resource}
                postType="resource"
                canPublish={canPublish}
              />
              {canUpdate && <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedResource(resource);
                  setEditDialogOpen(true);
                }}
                data-testid={`button-edit-resource-${resource.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>}
              {canDelete && <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (confirm('정말 이 자료를 삭제하시겠습니까?')) {
                    try {
                      await deletePost(resource.id);
                      toast({ title: "자료가 삭제되었습니다" });
                      invalidate();
                    } catch {
                      toast({ title: "삭제 실패", variant: "destructive" });
                    }
                  }
                }}
                data-testid={`button-delete-resource-${resource.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>}
            </div>
          </div>
        ))}
      </div>

      {selectedResource && editDialogOpen && (
        <Dialog open={editDialogOpen} onOpenChange={(open) => !open && setEditDialogOpen(false)}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>자료 수정</DialogTitle>
            </DialogHeader>
            <EditResourceForm
              resource={selectedResource}
              onSuccess={() => {
                setEditDialogOpen(false);
                invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </TabsContent>
  );
}
