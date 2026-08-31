import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updatePostStatus, type PostPublicationStatus } from '@/lib/adminPostApi';
import type { PostWithTranslations } from '@shared/schema';

interface PostPublicationToggleProps {
  post: PostWithTranslations;
  postType: 'news' | 'event' | 'resource';
  canPublish: boolean;
}

export function PostPublicationToggle({
  post,
  postType,
  canPublish,
}: PostPublicationToggleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isPublished = post.status === 'published';
  const isArchived = post.status === 'archived';

  const mutation = useMutation({
    mutationFn: (status: PostPublicationStatus) => updatePostStatus(post.id, status),
    onSuccess: (_updatedPost, status) => {
      toast({
        title: status === 'published' ? '게시되었습니다' : '임시저장으로 변경되었습니다',
      });
    },
    onError: (error) => {
      toast({
        title: '게시 상태 변경 실패',
        description: error instanceof Error ? error.message : '다시 시도해 주세요.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === '/api/posts',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
  });

  return (
    <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <Switch
        checked={isPublished}
        onCheckedChange={(checked) => {
          mutation.mutate(checked ? 'published' : 'draft');
        }}
        disabled={!canPublish || isArchived || mutation.isPending}
        aria-label={`${post.translations?.[0]?.title || post.slug} 게시 여부`}
        data-testid={`switch-publish-${postType}-${post.id}`}
      />
      <span className={`text-xs font-medium ${isPublished ? 'text-green-600' : 'text-muted-foreground'}`}>
        {isArchived ? '보관됨' : isPublished ? '게시됨' : '임시저장'}
      </span>
    </div>
  );
}