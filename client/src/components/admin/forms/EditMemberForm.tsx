import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { memberSchema, type MemberFormValues } from '../adminSchemas';
import type { Member } from '@shared/schema';
import { useUpdateMember } from '@/hooks/useAdminMutations';

interface EditMemberFormProps {
  member: Member;
  onSuccess: () => void;
}

export function EditMemberForm({ member, onSuccess }: EditMemberFormProps) {
  const [logoUrl, setLogoUrl] = useState(member.logo || '');
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema) as any,
    defaultValues: {
      companyName: member.companyName,
      industry: member.industry,
      country: member.country,
      city: member.city,
      address: member.address,
      phone: member.phone || '',
      website: member.website || '',
      description: member.description || '',
      logo: member.logo || '',
      membershipLevel: member.membershipLevel || 'regular',
      membershipStatus: (member.membershipStatus === 'active' || member.membershipStatus === 'inactive'
        ? member.membershipStatus
        : 'pending'),
      isPublic: member.isPublic,
      contactPerson: member.contactPerson,
      contactEmail: member.contactEmail,
    }
  });
  const isPublic = watch('isPublic');

  const updateMutation = useUpdateMember({ memberId: member.id, logoUrl, onSuccess });

  return (
    <form onSubmit={handleSubmit(data => updateMutation.mutate(data))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">회사명</label>
          <Input {...register('companyName')} />
          {errors.companyName && <p className="text-sm text-destructive mt-1">{errors.companyName.message}</p>}
        </div>
        <div>
          <label className="form-label">업종</label>
          <Input {...register('industry')} />
          {errors.industry && <p className="text-sm text-destructive mt-1">{errors.industry.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="form-label">국가</label>
          <Input {...register('country')} />
        </div>
        <div>
          <label className="form-label">도시</label>
          <Input {...register('city')} />
        </div>
        <div>
          <label className="form-label">주소</label>
          <Input {...register('address')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">전화</label>
          <Input {...register('phone')} />
        </div>
        <div>
          <label className="form-label">웹사이트</label>
          <Input {...register('website')} placeholder="예: example.com 또는 https://example.com" />
        </div>
      </div>

      <div>
        <label className="form-label">로고 URL</label>
        <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="예: example.com/logo.png" />
        {logoUrl && <img src={logoUrl} alt="Logo" className="mt-2 h-12 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />}
      </div>

      <div>
        <label className="form-label">설명</label>
        <Textarea {...register('description')} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">담당자</label>
          <Input {...register('contactPerson')} />
          {errors.contactPerson && <p className="text-sm text-destructive mt-1">{errors.contactPerson.message}</p>}
        </div>
        <div>
          <label className="form-label">담당자 이메일</label>
          <Input {...register('contactEmail')} />
          {errors.contactEmail && <p className="text-sm text-destructive mt-1">{errors.contactEmail.message}</p>}
        </div>
      </div>

      <div>
        <label className="form-label">회원등급</label>
        <Select defaultValue={member.membershipLevel} onValueChange={(value) => setValue('membershipLevel', value)}>
          <SelectTrigger>
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
        <Select defaultValue={member.membershipStatus} onValueChange={(value) => setValue('membershipStatus', value as MemberFormValues['membershipStatus'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">승인 대기</SelectItem>
            <SelectItem value="active">활성</SelectItem>
            <SelectItem value="inactive">비활성</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <label className="form-label mb-0">디렉터리 공개</label>
          <p className="text-xs text-muted-foreground">활성 상태인 회원만 공개됩니다.</p>
        </div>
        <Switch
          checked={isPublic}
          onCheckedChange={(checked) => setValue('isPublic', checked, { shouldDirty: true, shouldValidate: true })}
          data-testid="switch-member-public"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? '저장 중...' : '저장'}
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess}>
          취소
        </Button>
      </div>
    </form>
  );
}
