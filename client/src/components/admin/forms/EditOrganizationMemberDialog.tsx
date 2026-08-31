import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ObjectUploader } from '@/components/ObjectUploader';
import type { UploadResult } from '@uppy/core';
import type { OrganizationMember } from '@shared/schema';
import { organizationMemberSchema, ORGANIZATION_CATEGORIES } from '../adminSchemas';
import { getUploadParameters } from '../uploadHelpers';

export function EditOrganizationMemberDialog({
  member,
  onSuccess,
  onClose,
  executivesOnly = false,
}: {
  member: OrganizationMember;
  onSuccess: () => void;
  onClose: () => void;
  executivesOnly?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(true);
  const { toast } = useToast();
  const [category, setCategory] = useState(member.category);
  const [isActive, setIsActive] = useState(member.isActive);
  const [photo, setPhoto] = useState(member.photo || '');

  const form = useForm({
    resolver: zodResolver(organizationMemberSchema),
    defaultValues: {
      name: member.name,
      nameEn: member.nameEn || '',
      nameZh: member.nameZh || '',
      position: member.position,
      positionEn: member.positionEn || '',
      positionZh: member.positionZh || '',
      category: member.category,
      photo: member.photo || '',
      description: member.description || '',
      descriptionEn: member.descriptionEn || '',
      descriptionZh: member.descriptionZh || '',
      sortOrder: member.sortOrder,
      isActive: member.isActive,
    }
  });

  useEffect(() => {
    setCategory(member.category);
    setIsActive(member.isActive);
    setPhoto(member.photo || '');
    form.reset({
      name: member.name,
      nameEn: member.nameEn || '',
      nameZh: member.nameZh || '',
      position: member.position,
      positionEn: member.positionEn || '',
      positionZh: member.positionZh || '',
      category: member.category,
      photo: member.photo || '',
      description: member.description || '',
      descriptionEn: member.descriptionEn || '',
      descriptionZh: member.descriptionZh || '',
      sortOrder: member.sortOrder,
      isActive: member.isActive,
    });
  }, [member, form]);

  const handleOpenChange = (open: boolean) => {
    setInternalOpen(open);
    if (!open) {
      onClose();
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof organizationMemberSchema>) => {
      const response = await fetch(`/api/organization-members/${member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...data,
          category,
          photo,
          isActive,
        })
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "구성원 정보가 수정되었습니다" });
      handleOpenChange(false);
      onSuccess();
    },
    onError: () => {
      toast({ title: "수정 실패", variant: "destructive" });
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
    <Dialog open={internalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>조직 구성원 수정</DialogTitle>
          <DialogDescription>조직 구성원 정보를 수정하세요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(data => updateMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">이름 (한국어) *</label>
              <Input {...form.register('name')} data-testid="input-org-edit-name" />
            </div>
            <div>
              <label className="text-sm font-medium">이름 (영어)</label>
              <Input {...form.register('nameEn')} data-testid="input-org-edit-name-en" />
            </div>
            <div>
              <label className="text-sm font-medium">이름 (중국어)</label>
              <Input {...form.register('nameZh')} data-testid="input-org-edit-name-zh" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">직책 (한국어) *</label>
              <Input {...form.register('position')} data-testid="input-org-edit-position" />
            </div>
            <div>
              <label className="text-sm font-medium">직책 (영어)</label>
              <Input {...form.register('positionEn')} data-testid="input-org-edit-position-en" />
            </div>
            <div>
              <label className="text-sm font-medium">직책 (중국어)</label>
              <Input {...form.register('positionZh')} data-testid="input-org-edit-position-zh" />
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
                  <SelectTrigger data-testid="select-org-edit-category">
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
                <Input value="임원진" disabled data-testid="input-org-edit-category-executives" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">정렬 순서</label>
              <Input type="number" {...form.register('sortOrder', { valueAsNumber: true })} data-testid="input-org-edit-sort-order" />
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
                <img src={photo} alt="미리보기" className="w-12 h-12 rounded-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">설명 (한국어)</label>
            <Textarea {...form.register('description')} data-testid="textarea-org-edit-description" />
          </div>
          <div>
            <label className="text-sm font-medium">설명 (영어)</label>
            <Textarea {...form.register('descriptionEn')} data-testid="textarea-org-edit-description-en" />
          </div>
          <div>
            <label className="text-sm font-medium">설명 (중국어)</label>
            <Textarea {...form.register('descriptionZh')} data-testid="textarea-org-edit-description-zh" />
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} data-testid="switch-org-edit-active" />
            <span className="text-sm">{isActive ? '활성' : '비활성'}</span>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-org-edit">
              {updateMutation.isPending ? '수정 중...' : '수정'}
            </Button>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
