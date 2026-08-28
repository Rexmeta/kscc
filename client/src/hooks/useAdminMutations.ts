import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { createPost, updatePost, deletePost } from '@/lib/adminPostApi';
import { mapNewsFormToPost, mapEventFormToPost, mapResourceFormToPost, type NewsFormData, type EventFormData, type ResourceFormData } from '@/lib/adminPostMappers';
import type { MemberFormValues, NewsFormValues, EventFormValues, ResourceFormValues } from '@/components/admin/adminSchemas';
import { NEWS_META_KEYS, EVENT_META_KEYS, RESOURCE_META_KEYS } from '@shared/postMetaKeys';

const invalidatePosts = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === '/api/posts',
  });
const invalidateMembers = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === '/api/members',
  });

export function useCreateNewsPost(options: {
  userId: string;
  getFormData: (base: NewsFormValues) => NewsFormData;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (base: NewsFormValues) => {
      const formData = options.getFormData(base);
      const { post, translation, meta } = mapNewsFormToPost(formData, options.userId);
      return createPost({ post, translation, meta });
    },
    onSuccess: () => {
      toast({ title: '뉴스가 성공적으로 생성되었습니다' });
      invalidatePosts(queryClient);
      options.onSuccess();
    },
    onError: (error) => {
      toast({ title: '뉴스 생성 실패', description: error instanceof Error ? error.message : '알 수 없는 오류', variant: 'destructive' });
    },
  });
}

type UpdateNewsInput = NewsFormValues & {
  _featuredImageUrl: string;
  _mediaImages: string[];
  _mediaVideos: string[];
};

export function useUpdateNewsPost(options: {
  postId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateNewsInput) => {
      const { _featuredImageUrl, _mediaImages, _mediaVideos, ...formData } = input;
      return updatePost({
        postId: options.postId,
        post: {
          coverImage: _featuredImageUrl || formData.featuredImage || null,
          status: formData.isPublished ? 'published' : 'draft',
          publishedAt: formData.isPublished ? (formData.publishedAt ? new Date(formData.publishedAt) : new Date()) : null,
          tags: formData.category ? [formData.category] : [],
        },
        translation: {
          locale: 'ko',
          title: formData.title,
          excerpt: formData.excerpt,
          subtitle: formData.excerpt,
          content: formData.content || '',
        },
        meta: [
          { key: NEWS_META_KEYS.category, value: formData.category },
          ...(_mediaImages.length > 0 ? [{ key: NEWS_META_KEYS.images, value: _mediaImages }] : []),
          ...(_mediaVideos.length > 0 ? [{ key: NEWS_META_KEYS.videos, value: _mediaVideos }] : []),
        ],
      });
    },
    onSuccess: () => {
      toast({ title: '뉴스가 수정되었습니다' });
      invalidatePosts(queryClient);
      options.onSuccess();
    },
    onError: (error) => {
      toast({ title: '뉴스 수정 실패', description: error instanceof Error ? error.message : '알 수 없는 오류', variant: 'destructive' });
    },
  });
}

export function useDeleteNewsPost(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: () => {
      toast({ title: '뉴스가 삭제되었습니다' });
      invalidatePosts(queryClient);
      onSuccess?.();
    },
    onError: () => {
      toast({ title: '삭제 실패', variant: 'destructive' });
    },
  });
}

export function useCreateEventPost(options: {
  userId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: EventFormData) => {
      const { post, translation, meta } = mapEventFormToPost(formData, options.userId);
      return createPost({ post, translation, meta });
    },
    onSuccess: () => {
      toast({ title: '행사가 생성되었습니다' });
      invalidatePosts(queryClient);
      options.onSuccess();
    },
    onError: (error) => {
      toast({ title: '행사 생성 실패', description: error instanceof Error ? error.message : '알 수 없는 오류', variant: 'destructive' });
    },
  });
}

export function useUpdateEventPost(options: {
  postId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: EventFormValues) => {
      return updatePost({
        postId: options.postId,
        post: {
          status: formData.isPublished ? 'published' : 'draft',
          publishedAt: formData.isPublished ? new Date() : null,
        },
        translation: {
          locale: 'ko',
          title: formData.title,
          excerpt: formData.description,
          subtitle: formData.description,
          content: formData.content || '',
        },
        meta: [
          { key: EVENT_META_KEYS.eventDate, valueTimestamp: new Date(formData.eventDate) },
          ...(formData.endDate ? [{ key: EVENT_META_KEYS.endDate, valueTimestamp: new Date(formData.endDate) }] : []),
          { key: EVENT_META_KEYS.location, valueText: formData.location },
          { key: EVENT_META_KEYS.category, valueText: formData.category },
          { key: EVENT_META_KEYS.eventType, valueText: formData.eventType },
          ...(formData.capacity !== undefined ? [{ key: EVENT_META_KEYS.capacity, valueNumber: formData.capacity }] : []),
          { key: EVENT_META_KEYS.fee, valueNumber: formData.fee ?? 0 },
          ...(formData.registrationDeadline ? [{
            key: EVENT_META_KEYS.registrationDeadline,
            valueTimestamp: new Date(formData.registrationDeadline),
          }] : []),
          ...(formData.images && formData.images.length > 0 ? [{
            key: EVENT_META_KEYS.images,
            value: formData.images,
          }] : []),
        ],
      });
    },
    onSuccess: () => {
      toast({ title: '행사가 수정되었습니다' });
      invalidatePosts(queryClient);
      options.onSuccess();
    },
    onError: (error) => {
      toast({ title: '행사 수정 실패', description: error instanceof Error ? error.message : '알 수 없는 오류', variant: 'destructive' });
    },
  });
}

export function useDeleteEventPost(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: () => {
      toast({ title: '행사가 삭제되었습니다' });
      invalidatePosts(queryClient);
      onSuccess?.();
    },
    onError: () => {
      toast({ title: '삭제 실패', variant: 'destructive' });
    },
  });
}

type CreateResourceInput = ResourceFormData & { _uploadedFileUrl: string };

export function useCreateResourcePost(options: {
  userId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateResourceInput) => {
      const { _uploadedFileUrl, ...formData } = input;
      const { post, translation, meta } = mapResourceFormToPost(formData, options.userId, _uploadedFileUrl || formData.fileUrl);
      return createPost({ post, translation, meta });
    },
    onSuccess: () => {
      toast({ title: '자료가 생성되었습니다' });
      invalidatePosts(queryClient);
      options.onSuccess();
    },
    onError: (error) => {
      toast({ title: '자료 생성 실패', description: error instanceof Error ? error.message : '알 수 없는 오류', variant: 'destructive' });
    },
  });
}

type UpdateResourceInput = ResourceFormValues & { _uploadedFileUrl: string };

export function useUpdateResourcePost(options: {
  postId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateResourceInput) => {
      const { _uploadedFileUrl, ...formData } = input;
      const finalFileUrl = _uploadedFileUrl || formData.fileUrl;
      return updatePost({
        postId: options.postId,
        post: {
          status: formData.isPublished ? 'published' : 'draft',
          publishedAt: formData.isPublished ? new Date() : null,
          visibility: formData.visibility,
          tags: formData.tags || [],
        },
        translation: {
          locale: 'ko',
          title: formData.title,
          excerpt: formData.excerpt || '',
          subtitle: formData.excerpt || '',
          content: formData.content || '',
        },
        meta: finalFileUrl ? [{ key: RESOURCE_META_KEYS.fileUrl, value: finalFileUrl }] : [],
      });
    },
    onSuccess: () => {
      toast({ title: '자료가 수정되었습니다' });
      invalidatePosts(queryClient);
      options.onSuccess();
    },
    onError: (error) => {
      toast({ title: '자료 수정 실패', description: error instanceof Error ? error.message : '알 수 없는 오류', variant: 'destructive' });
    },
  });
}

export function useDeleteResourcePost(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: () => {
      toast({ title: '자료가 삭제되었습니다' });
      invalidatePosts(queryClient);
      onSuccess?.();
    },
    onError: () => {
      toast({ title: '삭제 실패', variant: 'destructive' });
    },
  });
}

export function useUpdateMember(options: {
  memberId: string;
  logoUrl: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: MemberFormValues) => {
      return apiRequest('PUT', `/api/members/${options.memberId}`, {
        ...data,
        logo: options.logoUrl || data.logo,
      });
    },
    onSuccess: () => {
      toast({ title: '회원 정보가 업데이트되었습니다' });
      invalidateMembers(queryClient);
      options.onSuccess();
    },
    onError: () => {
      toast({ title: '업데이트 실패', variant: 'destructive' });
    },
  });
}

