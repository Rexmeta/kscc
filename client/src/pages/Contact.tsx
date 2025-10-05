import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Phone, Mail, Clock, MessageSquare, Youtube, Linkedin, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { t } from '@/lib/i18n';

const inquirySchema = z.object({
  category: z.string().min(1, '문의 분류를 선택해주세요'),
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  subject: z.string().min(1, '제목을 입력해주세요'),
  message: z.string().min(10, '내용을 10자 이상 입력해주세요'),
  privacy: z.boolean().refine(val => val, '개인정보 수집 및 이용에 동의해주세요'),
});

type InquiryForm = z.infer<typeof inquirySchema>;

export default function ContactPage() {
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<InquiryForm>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      privacy: false,
    }
  });

  const inquiryMutation = useMutation({
    mutationFn: async (data: Omit<InquiryForm, 'privacy'>) => {
      const response = await apiRequest('POST', '/api/inquiries', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "문의가 전송되었습니다",
        description: "빠른 시일 내에 답변드리겠습니다.",
      });
      reset();
    },
    onError: () => {
      toast({
        title: "전송 실패",
        description: "문의 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InquiryForm) => {
    const { privacy, ...inquiryData } = data;
    inquiryMutation.mutate(inquiryData);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-muted py-16">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">{t('contact.title')}</h1>
            <p className="text-lg text-muted-foreground">Contact Us / 联系我们</p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Contact Form */}
            <Card className="p-8">
              <h3 className="mb-6 text-xl font-bold text-foreground">{t('contact.form.title')}</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="form-label">{t('contact.form.category')} *</label>
                  <Select onValueChange={(value) => setValue('category', value)}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membership">{t('contact.form.categories.membership')}</SelectItem>
                      <SelectItem value="event">{t('contact.form.categories.event')}</SelectItem>
                      <SelectItem value="partnership">{t('contact.form.categories.partnership')}</SelectItem>
                      <SelectItem value="other">{t('contact.form.categories.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
                  )}
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="form-label">{t('contact.form.name')} *</label>
                    <Input
                      placeholder="홍길동"
                      {...register('name')}
                      data-testid="input-name"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">{t('contact.form.company')}</label>
                    <Input
                      placeholder="회사명"
                      {...register('companyName')}
                      data-testid="input-company"
                    />
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="form-label">{t('contact.form.email')} *</label>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      {...register('email')}
                      data-testid="input-email"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">{t('contact.form.phone')}</label>
                    <Input
                      type="tel"
                      placeholder="010-0000-0000"
                      {...register('phone')}
                      data-testid="input-phone"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="form-label">{t('contact.form.subject')} *</label>
                  <Input
                    placeholder="문의 제목을 입력하세요"
                    {...register('subject')}
                    data-testid="input-subject"
                  />
                  {errors.subject && (
                    <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="form-label">{t('contact.form.message')} *</label>
                  <Textarea
                    rows={6}
                    placeholder="문의 내용을 입력하세요"
                    {...register('message')}
                    data-testid="textarea-message"
                  />
                  {errors.message && (
                    <p className="text-sm text-destructive mt-1">{errors.message.message}</p>
                  )}
                </div>
                
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="privacy"
                    onCheckedChange={(checked) => setValue('privacy', !!checked)}
                    data-testid="checkbox-privacy"
                  />
                  <label htmlFor="privacy" className="text-sm text-muted-foreground">
                    {t('contact.form.privacy')} <a href="#privacy" className="text-primary hover:underline">보기</a>
                  </label>
                </div>
                {errors.privacy && (
                  <p className="text-sm text-destructive">{errors.privacy.message}</p>
                )}
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={inquiryMutation.isPending}
                  data-testid="button-submit-inquiry"
                >
                  <Send className="h-4 w-4" />
                  {inquiryMutation.isPending ? '전송 중...' : t('contact.form.send')}
                </Button>
              </form>
            </Card>
            
            {/* Contact Information & Map */}
            <div className="space-y-6">
              {/* Office Info */}
              <Card className="p-8">
                <h3 className="mb-6 text-xl font-bold text-foreground">{t('contact.office.title')}</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground mb-1">{t('contact.office.address')}</div>
                      <div className="text-sm text-muted-foreground">서울특별시 강남구 테헤란로 123</div>
                      <div className="text-sm text-muted-foreground">한중빌딩 10층 (우: 06234)</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground mb-1">{t('contact.office.phone')}</div>
                      <div className="text-sm text-muted-foreground">+82-2-1234-5678</div>
                      <div className="text-sm text-muted-foreground">{t('contact.office.weekdays')}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground mb-1">{t('contact.office.email')}</div>
                      <div className="text-sm text-muted-foreground">info@kscc.kr</div>
                      <div className="text-sm text-muted-foreground">support@kscc.kr</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground mb-1">소셜 미디어</div>
                      <div className="flex gap-3 mt-2">
                        <a href="#kakao" className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors">
                          <MessageSquare className="h-4 w-4 text-secondary" />
                        </a>
                        <a href="#wechat" className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors">
                          <MessageSquare className="h-4 w-4 text-accent" />
                        </a>
                        <a href="#linkedin" className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                          <Linkedin className="h-4 w-4 text-primary" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Business Hours */}
              <Card className="p-6">
                <h3 className="mb-4 flex items-center text-lg font-bold text-foreground">
                  <Clock className="mr-2 h-5 w-5 text-primary" />
                  {t('contact.office.hours')}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">월요일 - 금요일</span>
                    <span className="font-medium text-foreground">{t('contact.office.weekdays')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">점심시간</span>
                    <span className="font-medium text-foreground">{t('contact.office.lunch')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">주말 및 공휴일</span>
                    <span className="font-medium text-accent">{t('contact.office.weekend')}</span>
                  </div>
                </div>
              </Card>
              
              {/* Map Placeholder */}
              <Card className="overflow-hidden">
                <div className="relative h-64 bg-muted">
                  <img 
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                    alt="Seoul Gangnam district map" 
                    className="h-full w-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-lg bg-white/90 p-4 text-center backdrop-blur-sm">
                      <Building2 className="mx-auto mb-2 h-8 w-8 text-primary" />
                      <div className="text-sm font-medium">지도에서 보기</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
