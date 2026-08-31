import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import PageEditModal from '@/components/PageEditModal';
import type { PostWithTranslations } from '@shared/schema';
import { useAdminPosts } from '@/hooks/useAdminData';
import { QueryState } from '@/components/QueryState';

export function PagesTab({ activeTab }: { activeTab: string }) {
  const [selectedPage, setSelectedPage] = useState<PostWithTranslations | null>(null);
  const [pageEditModalOpen, setPageEditModalOpen] = useState(false);

  const pagesQuery = useAdminPosts('page', activeTab);
  const { data: pagesData } = pagesQuery;

  return (
    <TabsContent value="pages" className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">페이지 관리</h2>
      </div>

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
              <div key={page.id} className="p-4 flex items-center justify-between" data-testid={`page-row-${page.id}`}>
                <div className="flex-1">
                  <h4 className="font-medium">{translation?.title || page.slug}</h4>
                  <p className="text-sm text-muted-foreground">
                    /{page.slug} • {page.status}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {translation?.excerpt || '페이지 설명 없음'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPage(page);
                      setPageEditModalOpen(true);
                    }}
                    data-testid={`button-edit-page-${page.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
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
