import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ObjectUploader } from '@/components/ObjectUploader';
import RichTextEditor from '@/components/RichTextEditor';
import type { UploadResult } from '@uppy/core';
import { type ResourceFormData } from '@/lib/adminPostMappers';
import { resourceSchema } from '../adminSchemas';
import { getResourceObjectAclVisibility, getUploadParameters, setObjectAcl } from '../uploadHelpers';
import { useCreateResourcePost } from '@/hooks/useAdminMutations';
import { enforceCreatePublishPermission } from '@/lib/adminPermissions';

interface CreateResourceDialogProps {
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateResourceDialog({ onSuccess, open, onOpenChange }: CreateResourceDialogProps) {
  const [fileUrl, setFileUrl] = useState('');
  const { toast } = useToast();
  const { user, isAdmin, hasPermission } = useAuth();
  const canPublish = isAdmin || hasPermission('resource.publish');

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<z.infer<typeof resourceSchema>>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: '',
      excerpt: '',
      content: '',
      tags: [],
      fileUrl: '',
      visibility: 'public',
      isPublished: false,
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

  const createMutation = useCreateResourcePost({
    userId: user?.id || '',
    onSuccess: () => {
      reset();
      setFileUrl('');
      onOpenChange(false);
      onSuccess();
    },
  });

  const onSubmit = (data: z.infer<typeof resourceSchema>) => {
    createMutation.mutate({
      ...data,
      excerpt: data.excerpt || '',
      isPublished: enforceCreatePublishPermission(canPublish, data.isPublished),
      _uploadedFileUrl: fileUrl,
    } as ResourceFormData & { _uploadedFileUrl: string });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 자료 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">제목</label>
            <Input {...register('title')} data-testid="input-resource-title" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="form-label">설명</label>
            <Textarea {...register('excerpt')} data-testid="textarea-resource-excerpt" />
            {errors.excerpt && <p className="text-sm text-destructive mt-1">{errors.excerpt?.message}</p>}
          </div>

          <div>
            <label className="form-label">상세 내용</label>
            <RichTextEditor
              value={watch('content') || ''}
              onChange={(value) => setValue('content', value)}
              data-testid="editor-resource-content"
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
            {fileUrl && (
              <p className="text-sm text-muted-foreground">
                선택된 파일: <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{fileUrl}</a>
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={isPublished} onCheckedChange={(c) => setValue('isPublished', c)} disabled={!canPublish} data-testid="switch-resource-published" />
            <span className="text-sm">{isPublished ? '발행됨' : '초안'}</span>
          </div>

          <div>
            <label className="form-label">공개 범위</label>
            <Select value={visibility} onValueChange={(value) => {
              setValue('visibility', value as 'public' | 'members' | 'premium');
              if (fileUrl) {
                void setObjectAcl(fileUrl, getResourceObjectAclVisibility(value as 'public' | 'members' | 'premium', isPublished));
              }
            }}>
              <SelectTrigger data-testid="select-resource-visibility">
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
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-resource">
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
