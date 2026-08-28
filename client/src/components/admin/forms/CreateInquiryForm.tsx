import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const inquirySchema = z.object({
  subject: z.string().trim().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이내로 입력해주세요'),
  name: z.string().trim().min(1, '이름을 입력해주세요').max(100, '이름은 100자 이내로 입력해주세요'),
  email: z.string().trim().email('유효한 이메일을 입력해주세요').max(254, '이메일은 254자 이내로 입력해주세요'),
  phone: z.string().trim().max(50, '전화번호는 50자 이내로 입력해주세요').optional(),
  companyName: z.string().trim().max(200, '회사명은 200자 이내로 입력해주세요').optional(),
  message: z.string().trim().min(1, '내용을 입력해주세요').max(10000, '내용은 10,000자 이내로 입력해주세요'),
});

type InquiryFormValues = z.infer<typeof inquirySchema>;

export function CreateInquiryForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [category, setCategory] = useState('');
  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      subject: '',
      message: '',
      name: '',
      email: '',
      phone: '',
      companyName: '',
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: InquiryFormValues) => {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, category })
      });
      if (!response.ok) throw new Error('Failed to create inquiry');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "문의가 접수되었습니다" });
      form.reset();
      setCategory('');
      onSuccess();
    },
    onError: () => {
      toast({ title: "문의 접수 실패", variant: "destructive" });
    }
  });

  return (
    <form onSubmit={form.handleSubmit(data => submitMutation.mutate(data))} className="space-y-4">
      <Input placeholder="제목" {...form.register('subject')} data-testid="input-inquiry-subject" />
      <Input placeholder="이름" {...form.register('name')} data-testid="input-inquiry-name" />
      <Input placeholder="이메일" type="email" {...form.register('email')} data-testid="input-inquiry-email" />
      <Input placeholder="전화번호" {...form.register('phone')} data-testid="input-inquiry-phone" />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger data-testid="select-inquiry-category">
          <SelectValue placeholder="카테고리 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="membership">회원 가입 문의</SelectItem>
          <SelectItem value="event">행사 문의</SelectItem>
          <SelectItem value="partnership">파트너십 문의</SelectItem>
          <SelectItem value="other">기타</SelectItem>
        </SelectContent>
      </Select>
      <Textarea placeholder="문의 내용" {...form.register('message')} data-testid="textarea-inquiry-message" />
      <Button type="submit" disabled={submitMutation.isPending || !category} data-testid="button-submit-inquiry" className="w-full">
        {submitMutation.isPending ? '접수 중...' : '문의 접수'}
      </Button>
    </form>
  );
}
