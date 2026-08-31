import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getMetaValue } from '@/lib/postHelpers';
import { deletePost } from '@/lib/adminPostApi';
import type { PostWithTranslations } from '@shared/schema';
import { CreateNewsDialog } from '../forms/CreateNewsDialog';
import { EditNewsForm } from '../forms/EditNewsForm';
import { useAdminPosts } from '@/hooks/useAdminData';
import { PostPublicationToggle } from '../PostPublicationToggle';
import { QueryState } from '@/components/QueryState';

export function ArticlesTab({
  activeTab,
  createNewsDialogOpen,
  setCreateNewsDialogOpen
}: {
  activeTab: string;
  createNewsDialogOpen: boolean;
  setCreateNewsDialogOpen: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, hasPermission } = useAuth();
  const [selectedArticle, setSelectedArticle] = useState<PostWithTranslations | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const newsQuery = useAdminPosts('news', activeTab);
  const { data: newsData } = newsQuery;
  const canCreate = isAdmin || hasPermission('news.create');
  const canUpdate = isAdmin || hasPermission('news.update');
  const canPublish = isAdmin || hasPermission('news.publish');
  const canDelete = isAdmin;
  const invalidate = () => {
    queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/posts' });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
  };

  return (
    <TabsContent value="articles" className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">뉴스 관리</h2>
        {canCreate && (
          <>
            <Button onClick={() => setCreateNewsDialogOpen(true)} data-testid="button-create-news">
              <Plus className="h-4 w-4 mr-1" />
              뉴스 생성
            </Button>
            <CreateNewsDialog
              open={createNewsDialogOpen}
              onOpenChange={setCreateNewsDialogOpen}
              onSuccess={invalidate}
            />
          </>
        )}
      </div>

      <QueryState
        isLoading={newsQuery.isLoading}
        isError={newsQuery.isError}
        onRetry={() => newsQuery.refetch()}
        empty={!newsData?.posts?.length}
        emptyMessage="뉴스가 없습니다."
      >
      <div className="grid gap-4">
        {newsData?.posts?.map((article: PostWithTranslations) => (
          <div key={article.id} className="p-4 border rounded flex justify-between items-start gap-4">
            {article.coverImage && (
              <img
                src={article.coverImage}
                alt={article.translations?.[0]?.title || '뉴스'}
                className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                data-testid={`img-news-${article.id}`}
                onError={(e) => e.currentTarget.style.display = 'none'}
                onClick={() => {
                  setSelectedArticle(article);
                  setViewDialogOpen(true);
                }}
              />
            )}
            <div
              className="flex-1 cursor-pointer hover:bg-muted/50 rounded p-2 -m-2 transition-colors"
              onClick={() => {
                setSelectedArticle(article);
                setViewDialogOpen(true);
              }}
              data-testid={`news-item-${article.id}`}
            >
              <h4 className="font-medium mb-2">{article.translations?.[0]?.title || '제목 없음'}</h4>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{article.translations?.[0]?.excerpt || '설명 없음'}</p>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>{new Date(article.publishedAt || article.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <PostPublicationToggle
                post={article}
                postType="news"
                canPublish={canPublish}
              />
              {canUpdate && <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedArticle(article);
                  setEditDialogOpen(true);
                }}
                data-testid={`button-edit-news-${article.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>}
              {canDelete && <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (confirm('정말 이 뉴스를 삭제하시겠습니까?')) {
                    try {
                      await deletePost(article.id);
                      toast({ title: "뉴스가 삭제되었습니다" });
                      invalidate();
                    } catch (error) {
                      toast({ title: "삭제 실패", variant: "destructive" });
                    }
                  }
                }}
                data-testid={`button-delete-news-${article.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>}
            </div>
          </div>
        ))}
      </div>
      </QueryState>

      {selectedArticle && editDialogOpen && (
        <Dialog open={editDialogOpen} onOpenChange={(open) => !open && setEditDialogOpen(false)}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>뉴스 수정</DialogTitle>
            </DialogHeader>
            <EditNewsForm
              news={selectedArticle}
              onSuccess={() => {
                setEditDialogOpen(false);
                invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {selectedArticle && viewDialogOpen && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <DialogTitle className="text-xl font-bold mb-2">
                    {selectedArticle.translations?.[0]?.title || '제목 없음'}
                  </DialogTitle>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{new Date(selectedArticle.publishedAt || selectedArticle.createdAt).toLocaleDateString()}</span>
                    <Badge variant="secondary">{selectedArticle.status === 'published' ? '게시됨' : '임시저장'}</Badge>
                    {(() => {
                      const category = getMetaValue(selectedArticle.meta || [], 'category');
                      return category ? (
                        <Badge variant="outline">
                          {category === 'notice' ? '공지사항' : category === 'news' ? '뉴스' : category === 'column' ? '칼럼' : category === 'announcement' ? '공지사항' : category}
                        </Badge>
                      ) : null;
                    })()}
                  </div>
                </div>
                {canUpdate && <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    setTimeout(() => {
                      setEditDialogOpen(true);
                    }, 100);
                  }}
                  data-testid="button-edit-from-view"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Button>}
              </div>
            </DialogHeader>

            <div className="mt-4 space-y-6">
              {selectedArticle.coverImage && (
                <div className="w-full">
                  <img
                    src={selectedArticle.coverImage}
                    alt={selectedArticle.translations?.[0]?.title || '뉴스 이미지'}
                    className="w-full max-h-96 object-cover rounded-lg"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                </div>
              )}

              {selectedArticle.translations?.[0]?.excerpt && (
                <div className="text-muted-foreground italic border-l-4 border-primary pl-4">
                  {selectedArticle.translations[0].excerpt}
                </div>
              )}

              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: selectedArticle.translations?.[0]?.content || '<p>내용이 없습니다.</p>'
                }}
              />

              {(() => {
                const newsImages = getMetaValue(selectedArticle.meta || [], 'news.images');
                return Array.isArray(newsImages) && newsImages.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">추가 이미지</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {newsImages.map((img: string, idx: number) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`추가 이미지 ${idx + 1}`}
                          className="w-full h-40 object-cover rounded-lg border"
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </TabsContent>
  );
}
