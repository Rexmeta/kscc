import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ObjectUploader } from '@/components/ObjectUploader';
import RichTextEditor from '@/components/RichTextEditor';
import type { UploadResult } from '@uppy/core';
import { resourceSchema, type ResourceFormValues } from '../adminSchemas';
import { getResourceObjectAclVisibility, getUploadParameters, setObjectAcl } from '../uploadHelpers';
import type { PostWithTranslations } from '@shared/schema';
import { useUpdateResourcePost } from '@/hooks/useAdminMutations';

export function EditResourceForm({ resource, onSuccess }: { resource: PostWithTranslations; onSuccess: () => void }) {
  const { toast } = useToast();
  const [fileUrl, setFileUrl] = useState('');

  const translation = resource.translations?.[0];
  const fileUrlMeta = resource.meta?.find((m) => m.key === 'resource.fileUrl');
  const existingFileUrl: string = fileUrlMeta?.valueText ||
    (typeof fileUrlMeta?.value === 'string' ? fileUrlMeta.value : '') || '';

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: translation?.title || '',
      excerpt: translation?.excerpt || '',
      content: translation?.content || '',
      tags: (resource.tags as string[]) || [],
      fileUrl: existingFileUrl,
      visibility: resource.visibility === 'members' || resource.visibility === 'premium' ? resource.visibility : 'public',
      isPublished: resource.status === 'published',
    }
  });

  const isPublished = watch('isPublished');
  const visibility = watch('visibility');

  const handleFileUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = window.__lastUploadObjectPath || '';
      if (objectPath) {
        await setObjectAcl(objectPath, getResourceObjectAclVisibility(visibility, isPublished));
        setFileUrl(objectPath);
        setValue('fileUrl', objectPath);
        toast({ title: '파일 업로드 완료!' });
      }
    }
  };

  const updateMutation = useUpdateResourcePost({ postId: resource.id, onSuccess });

  return (
    <form onSubmit={handleSubmit((data) => updateMutation.mutate({ ...data, _uploadedFileUrl: fileUrl }))} className="space-y-4">
      <div>
        <label className="form-label">제목</label>
        <Input {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{String(errors.title.message)}</p>}
      </div>
      <div>
        <label className="form-label">설명</label>
        <Textarea {...register('excerpt')} />
        {errors.excerpt && <p className="text-sm text-destructive">{String(errors.excerpt.message)}</p>}
      </div>
      <div>
        <label className="form-label">내용</label>
        <RichTextEditor
          value={watch('content') || ''}
          onChange={(value) => setValue('content', value)}
          data-testid="editor-resource-content-edit"
        />
      </div>
      <div>
        <label className="form-label">첨부파일</label>
        <div className="flex gap-2 mb-4">
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={104857600}
            onGetUploadParameters={getUploadParameters}
            onComplete={handleFileUpload}
            buttonClassName="whitespace-nowrap"
          >
            <Upload className="h-4 w-4 mr-2" />
            파일 선택
          </ObjectUploader>
        </div>
        {(fileUrl || existingFileUrl) && (
          <p className="text-sm text-muted-foreground">
            현재 파일: <a href={fileUrl || existingFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{fileUrl || existingFileUrl}</a>
          </p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Switch checked={isPublished} onCheckedChange={(c) => setValue('isPublished', c)} />
        <span className="text-sm">{isPublished ? '발행됨' : '초안'}</span>
      </div>
      <div>
        <label className="form-label">공개 범위</label>
        <Select value={visibility} onValueChange={(value) => {
          const nextVisibility = value as 'public' | 'members' | 'premium';
          setValue('visibility', nextVisibility);
          const objectPath = fileUrl || existingFileUrl;
          if (objectPath) {
            void setObjectAcl(objectPath, getResourceObjectAclVisibility(nextVisibility, isPublished));
          }
        }}>
          <SelectTrigger data-testid="select-resource-visibility-edit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">공개</SelectItem>
            <SelectItem value="members">회원 전용</SelectItem>
            <SelectItem value="premium">프리미엄 회원 전용</SelectItem>
          </SelectContent>
        </Select>
        {errors.visibility && <p className="text-sm text-destructive mt-1">{errors.visibility.message}</p>}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? '수정 중...' : '수정'}</Button>
        <Button type="button" variant="outline" onClick={onSuccess}>취소</Button>
      </div>
    </form>
  );
}
