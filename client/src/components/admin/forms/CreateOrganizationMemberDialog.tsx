import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ObjectUploader } from '@/components/ObjectUploader';
import type { UploadResult } from '@uppy/core';
import { organizationMemberSchema, ORGANIZATION_CATEGORIES } from '../adminSchemas';
import { getUploadParameters } from '../uploadHelpers';

export function CreateOrganizationMemberDialog({ onSuccess, executivesOnly = false }: { onSuccess: () => void; executivesOnly?: boolean }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast();
  const [category, setCategory] = useState(executivesOnly ? 'executives' : '');
  const [isActive, setIsActive] = useState(true);
  const [photo, setPhoto] = useState('');

  const form = useForm({
    resolver: zodResolver(organizationMemberSchema),
    defaultValues: {
      name: '',
      nameEn: '',
      nameZh: '',
      position: '',
      positionEn: '',
      positionZh: '',
      category: executivesOnly ? 'executives' : '',
      photo: '',
      description: '',
      descriptionEn: '',
      descriptionZh: '',
      sortOrder: 0,
      isActive: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof organizationMemberSchema>) => {
      const response = await fetch('/api/organization-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...data,
          category: executivesOnly ? 'executives' : category,
          photo,
          isActive,
        })
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "구성원이 추가되었습니다" });
      form.reset();
      setCategory(executivesOnly ? 'executives' : '');
      setPhoto('');
      setIsActive(true);
      setInternalOpen(false);
      onSuccess();
    },
    onError: () => {
      toast({ title: "추가 실패", variant: "destructive" });
    }
  });

  const setPhotoPublicAcl = async (objectPath: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: objectPath }),
      });
    } catch (e) {
      console.error('Failed to set photo ACL:', e);
    }
  };

  const handlePhotoUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = window.__lastUploadObjectPath || '';
      if (objectPath) {
        await setPhotoPublicAcl(objectPath);
        setPhoto(objectPath);
      }
    }
  };

  return (
    <Dialog open={internalOpen} onOpenChange={setInternalOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setInternalOpen(true)} data-testid="button-create-org-member">
          <Plus className="h-4 w-4 mr-2" />
          구성원 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>조직 구성원 추가</DialogTitle>
          <DialogDescription>새로운 조직 구성원 정보를 입력하세요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(data => createMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">이름 (한국어) *</label>
              <Input {...form.register('name')} data-testid="input-org-name" />
            </div>
            <div>
              <label className="text-sm font-medium">이름 (영어)</label>
              <Input {...form.register('nameEn')} data-testid="input-org-name-en" />
            </div>
            <div>
              <label className="text-sm font-medium">이름 (중국어)</label>
              <Input {...form.register('nameZh')} data-testid="input-org-name-zh" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">직책 (한국어) *</label>
              <Input {...form.register('position')} data-testid="input-org-position" />
            </div>
            <div>
              <label className="text-sm font-medium">직책 (영어)</label>
              <Input {...form.register('positionEn')} data-testid="input-org-position-en" />
            </div>
            <div>
              <label className="text-sm font-medium">직책 (중국어)</label>
              <Input {...form.register('positionZh')} data-testid="input-org-position-zh" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!executivesOnly ? (
              <div>
                <label className="text-sm font-medium">카테고리 *</label>
                <Select value={category} onValueChange={(value) => {
                  setCategory(value);
                  form.setValue('category', value);
                }}>
                  <SelectTrigger data-testid="select-org-category">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGANIZATION_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">카테고리</label>
                <Input value="임원진" disabled data-testid="input-org-category-executives" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">정렬 순서</label>
              <Input type="number" {...form.register('sortOrder', { valueAsNumber: true })} data-testid="input-org-sort-order" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">사진</label>
            <div className="flex gap-2 items-center">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={getUploadParameters}
                onComplete={handlePhotoUpload}
                buttonClassName="whitespace-nowrap"
              >
                <Upload className="h-4 w-4 mr-2" />
                사진 업로드
              </ObjectUploader>
              {photo && (
                <img src={photo} alt="미리보기" className="w-12 h-12 rounded-full object-cover" />
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">설명 (한국어)</label>
            <Textarea {...form.register('description')} data-testid="textarea-org-description" />
          </div>
          <div>
            <label className="text-sm font-medium">설명 (영어)</label>
            <Textarea {...form.register('descriptionEn')} data-testid="textarea-org-description-en" />
          </div>
          <div>
            <label className="text-sm font-medium">설명 (중국어)</label>
            <Textarea {...form.register('descriptionZh')} data-testid="textarea-org-description-zh" />
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} data-testid="switch-org-active" />
            <span className="text-sm">{isActive ? '활성' : '비활성'}</span>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending || !category} data-testid="button-submit-org-member">
              {createMutation.isPending ? '추가 중...' : '추가'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setInternalOpen(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
