import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ApiRequestError, apiRequest } from '@/lib/queryClient';
import { insertPartnerSchema, type Partner } from '@shared/schema';

type PartnerFormValues = z.infer<typeof insertPartnerSchema>;

const defaultValues: PartnerFormValues = {
  name: '',
  nameEn: '',
  nameZh: '',
  logo: '',
  website: '',
  description: '',
  descriptionEn: '',
  descriptionZh: '',
  category: 'partner',
  isActive: true,
  order: 0,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    const body = error.responseBody;
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      return body.message;
    }
  }
  return error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.';
}

export function PartnerDialog({
  partner,
  open,
  onOpenChange,
  onSuccess,
}: {
  partner?: Partner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const isEdit = Boolean(partner);
  const [serverError, setServerError] = useState('');
  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(insertPartnerSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(partner ? {
      name: partner.name,
      nameEn: partner.nameEn || '',
      nameZh: partner.nameZh || '',
      logo: partner.logo,
      website: partner.website || '',
      description: partner.description || '',
      descriptionEn: partner.descriptionEn || '',
      descriptionZh: partner.descriptionZh || '',
      category: partner.category as PartnerFormValues['category'],
      isActive: partner.isActive,
      order: partner.order ?? 0,
    } : defaultValues);
    setServerError('');
  }, [form, partner, open]);

  const mutation = useMutation({
    mutationFn: async (data: PartnerFormValues) => {
      const response = await apiRequest(
        isEdit ? 'PUT' : 'POST',
        isEdit ? `/api/partners/${partner!.id}` : '/api/partners',
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      toast({ title: isEdit ? '파트너 정보가 수정되었습니다' : '파트너가 추가되었습니다' });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setServerError(message);
      toast({
        title: isEdit ? '파트너 수정 실패' : '파트너 추가 실패',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const close = () => {
    if (mutation.isPending) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '파트너 수정' : '파트너 추가'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '파트너 정보를 수정하세요.' : '새 파트너 정보를 입력하세요.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">이름 (한국어) *</label>
              <Input {...form.register('name')} data-testid="input-partner-name" />
              {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="form-label">이름 (영어)</label>
              <Input {...form.register('nameEn')} data-testid="input-partner-name-en" />
            </div>
            <div>
              <label className="form-label">이름 (중국어)</label>
              <Input {...form.register('nameZh')} data-testid="input-partner-name-zh" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">카테고리 *</label>
              <Select
                value={form.watch('category')}
                onValueChange={(value) => form.setValue('category', value as PartnerFormValues['category'])}
              >
                <SelectTrigger data-testid="select-partner-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">파트너</SelectItem>
                  <SelectItem value="sponsor">후원사</SelectItem>
                  <SelectItem value="government">정부기관</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">정렬 순서</label>
              <Input type="number" {...form.register('order', { valueAsNumber: true })} data-testid="input-partner-order" />
              {form.formState.errors.order && <p className="text-sm text-destructive mt-1">{form.formState.errors.order.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">로고 URL *</label>
              <Input {...form.register('logo')} placeholder="https://..." data-testid="input-partner-logo" />
              {form.formState.errors.logo && <p className="text-sm text-destructive mt-1">{form.formState.errors.logo.message}</p>}
            </div>
            <div>
              <label className="form-label">웹사이트</label>
              <Input {...form.register('website')} placeholder="https://..." data-testid="input-partner-website" />
              {form.formState.errors.website && <p className="text-sm text-destructive mt-1">{form.formState.errors.website.message}</p>}
            </div>
          </div>

          <div>
            <label className="form-label">설명 (한국어)</label>
            <Textarea {...form.register('description')} rows={3} data-testid="textarea-partner-description" />
          </div>
          <div>
            <label className="form-label">설명 (영어)</label>
            <Textarea {...form.register('descriptionEn')} rows={3} data-testid="textarea-partner-description-en" />
          </div>
          <div>
            <label className="form-label">설명 (중국어)</label>
            <Textarea {...form.register('descriptionZh')} rows={3} data-testid="textarea-partner-description-zh" />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <label className="form-label mb-0">공개 상태</label>
              <p className="text-xs text-muted-foreground">비활성 파트너는 공개 페이지에 표시되지 않습니다.</p>
            </div>
            <Switch
              checked={form.watch('isActive')}
              onCheckedChange={(checked) => form.setValue('isActive', checked)}
              data-testid="switch-partner-active"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-partner">
              {mutation.isPending ? (isEdit ? '수정 중...' : '추가 중...') : (isEdit ? '수정' : '추가')}
            </Button>
            <Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>취소</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}