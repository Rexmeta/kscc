import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { memberSchema, type MemberFormValues } from '../adminSchemas';
import { useCreateMember } from '@/hooks/useAdminMutations';

const defaultValues: MemberFormValues = {
  companyName: '',
  industry: '',
  country: '',
  city: '',
  address: '',
  phone: '',
  website: '',
  description: '',
  logo: '',
  membershipLevel: 'regular',
  membershipStatus: 'active',
  isPublic: true,
  contactPerson: '',
  contactEmail: '',
};

export function CreateMemberDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema) as any,
    defaultValues,
  });
  const createMutation = useCreateMember({
    onSuccess: () => {
      form.reset(defaultValues);
      setLogoUrl('');
      setOpen(false);
      onSuccess();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-member">
          <Plus className="h-4 w-4 mr-2" />
          회원사 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>회원사 추가</DialogTitle>
          <DialogDescription>새 회원사의 정보를 입력하세요.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((data) =>
            createMutation.mutate({ ...data, logo: logoUrl }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">회사명 *</label>
              <Input {...form.register('companyName')} data-testid="input-create-member-company-name" />
              {form.formState.errors.companyName && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.companyName.message}</p>
              )}
            </div>
            <div>
              <label className="form-label">업종 *</label>
              <Input {...form.register('industry')} data-testid="input-create-member-industry" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">국가 *</label>
              <Input {...form.register('country')} data-testid="input-create-member-country" />
            </div>
            <div>
              <label className="form-label">도시 *</label>
              <Input {...form.register('city')} data-testid="input-create-member-city" />
            </div>
            <div>
              <label className="form-label">주소 *</label>
              <Input {...form.register('address')} data-testid="input-create-member-address" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">담당자 *</label>
              <Input {...form.register('contactPerson')} data-testid="input-create-member-contact-person" />
            </div>
            <div>
              <label className="form-label">담당자 이메일 *</label>
              <Input type="email" {...form.register('contactEmail')} data-testid="input-create-member-contact-email" />
              {form.formState.errors.contactEmail && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.contactEmail.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">전화</label>
              <Input {...form.register('phone')} data-testid="input-create-member-phone" />
            </div>
            <div>
              <label className="form-label">웹사이트</label>
              <Input {...form.register('website')} placeholder="https://" data-testid="input-create-member-website" />
            </div>
          </div>

          <div>
            <label className="form-label">로고 URL</label>
            <Input
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://..."
              data-testid="input-create-member-logo"
            />
          </div>

          <div>
            <label className="form-label">설명</label>
            <Textarea {...form.register('description')} rows={3} data-testid="textarea-create-member-description" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">회원등급</label>
              <Select
                value={form.watch('membershipLevel')}
                onValueChange={(value) => form.setValue('membershipLevel', value)}
              >
                <SelectTrigger data-testid="select-create-member-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">정회원</SelectItem>
                  <SelectItem value="premium">프리미엄</SelectItem>
                  <SelectItem value="sponsor">후원</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">승인 상태</label>
              <Select
                value={form.watch('membershipStatus')}
                onValueChange={(value) => form.setValue('membershipStatus', value as MemberFormValues['membershipStatus'])}
              >
                <SelectTrigger data-testid="select-create-member-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">승인 대기</SelectItem>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <label className="form-label mb-0">디렉터리 공개</label>
              <p className="text-xs text-muted-foreground">활성 상태인 회원사만 공개됩니다.</p>
            </div>
            <Switch
              checked={form.watch('isPublic')}
              onCheckedChange={(checked) => form.setValue('isPublic', checked)}
              data-testid="switch-create-member-public"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create-member">
              {createMutation.isPending ? '추가 중...' : '회원사 추가'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}