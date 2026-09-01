import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Phone, Mail, Clock, MessageSquare, Send, Edit, MapPin, ExternalLink } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import PageEditModal from '@/components/PageEditModal';
import type { PostWithTranslations } from '@shared/schema';
import { fetchJson } from '@/lib/queryClient';

const inquirySchema = z.object({
  category: z.string().min(1, '문의 분류를 선택해주세요'),
  name: z.string().trim().min(1, '이름을 입력해주세요').max(100, '이름은 100자 이내로 입력해주세요'),
  email: z.string().trim().email('올바른 이메일을 입력해주세요').max(254, '이메일은 254자 이내로 입력해주세요'),
  phone: z.string().trim().max(50, '전화번호는 50자 이내로 입력해주세요').optional(),
  companyName: z.string().trim().max(200, '회사명은 200자 이내로 입력해주세요').optional(),
  subject: z.string().trim().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이내로 입력해주세요'),
  message: z.string().trim().min(10, '내용을 10자 이상 입력해주세요').max(10000, '내용은 10,000자 이내로 입력해주세요'),
  privacy: z.boolean().refine(val => val, '개인정보 수집 및 이용에 동의해주세요'),
});

type InquiryForm = z.infer<typeof inquirySchema>;

const OFFICE_MAP_URL = 'https://www.openstreetmap.org/export/embed.html?bbox=127.0715%2C37.2038%2C127.0770%2C37.2094&layer=mapnik&marker=37.2066154%2C127.0742566';
const OFFICE_EXTERNAL_MAP_URL = 'https://www.openstreetmap.org/?mlat=37.2066154&mlon=127.0742566#map=18/37.2066154/127.0742566';

interface ContactContent {
  office: {
    title: string;
    address: string;
    phone: string;
    email: string;
    hours: {
      weekdays: string;
      lunch: string;
      weekend: string;
    };
  };
  categories: {
    membership: string;
    event: string;
    partnership: string;
    other: string;
  };
}

export default function ContactPage() {
  const { toast } = useToast();
  const { isAdmin, hasPermission } = useAuth();
  const canEditPage = isAdmin || hasPermission('page.update');
  const { language } = useLanguage();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const { data: page } = useQuery<PostWithTranslations>({
    queryKey: ['/api/posts/slug', 'contact', language],
    queryFn: async ({ signal }) => {
      return fetchJson(`/api/posts/slug/contact?locale=${language}`, { signal });
    },
  });

  const getTranslation = () => {
    if (!page?.translations) return null;
    return page.translations.find(t => t.locale === language) || page.translations[0];
  };

  const translation = getTranslation();
  
  const parseContent = (): ContactContent | null => {
    if (!translation?.content) return null;
    try {
      return JSON.parse(translation.content);
    } catch {
      return null;
    }
  };

  const content = parseContent();
  
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
    <div className="min-h-screen relative bg-background dark:bg-background">
      {canEditPage && page && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="fixed bottom-6 right-6 z-50 shadow-lg"
            onClick={() => setIsEditModalOpen(true)}
            data-testid="button-edit-page"
          >
            <Edit className="h-4 w-4 mr-2" />
            페이지 편집
          </Button>
          <PageEditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            page={page}
          />
        </>
      )}

      {/* Header */}
      <section className="bg-muted dark:bg-muted py-16">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground dark:text-foreground">{t('contact.title')}</h1>
            <p className="text-lg text-muted-foreground dark:text-muted-foreground">Contact Us / 联系我们</p>
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
                  <label htmlFor="inquiry-category" className="form-label">{t('contact.form.category')} *</label>
                  <Select onValueChange={(value) => setValue('category', value, { shouldValidate: true })}>
                    <SelectTrigger id="inquiry-category" aria-describedby={errors.category ? 'error-category' : undefined} data-testid="select-category">
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
                    <p id="error-category" role="alert" className="text-sm text-destructive mt-1">{errors.category.message}</p>
                  )}
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="inquiry-name" className="form-label">{t('contact.form.name')} *</label>
                    <Input
                      placeholder="홍길동"
                      maxLength={100}
                      id="inquiry-name"
                      aria-describedby={errors.name ? 'error-name' : undefined}
                      {...register('name')}
                      data-testid="input-name"
                    />
                    {errors.name && (
                      <p id="error-name" role="alert" className="text-sm text-destructive mt-1">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="inquiry-company" className="form-label">{t('contact.form.company')}</label>
                    <Input
                      placeholder="회사명"
                      maxLength={200}
                      id="inquiry-company"
                      {...register('companyName')}
                      data-testid="input-company"
                    />
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="inquiry-email" className="form-label">{t('contact.form.email')} *</label>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      maxLength={254}
                      id="inquiry-email"
                      aria-describedby={errors.email ? 'error-email' : undefined}
                      {...register('email')}
                      data-testid="input-email"
                    />
                    {errors.email && (
                      <p id="error-email" role="alert" className="text-sm text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="inquiry-phone" className="form-label">{t('contact.form.phone')}</label>
                    <Input
                      type="tel"
                      placeholder="010-0000-0000"
                      maxLength={50}
                      id="inquiry-phone"
                      {...register('phone')}
                      data-testid="input-phone"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="inquiry-subject" className="form-label">{t('contact.form.subject')} *</label>
                  <Input
                    placeholder="문의 제목을 입력하세요"
                    maxLength={200}
                    id="inquiry-subject"
                    aria-describedby={errors.subject ? 'error-subject' : undefined}
                    {...register('subject')}
                    data-testid="input-subject"
                  />
                  {errors.subject && (
                    <p id="error-subject" role="alert" className="text-sm text-destructive mt-1">{errors.subject.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="inquiry-message" className="form-label">{t('contact.form.message')} *</label>
                  <Textarea
                    rows={6}
                    placeholder="문의 내용을 입력하세요"
                    maxLength={10000}
                    id="inquiry-message"
                    aria-describedby={errors.message ? 'error-message' : undefined}
                    {...register('message')}
                    data-testid="textarea-message"
                  />
                  {errors.message && (
                    <p id="error-message" role="alert" className="text-sm text-destructive mt-1">{errors.message.message}</p>
                  )}
                </div>
                
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="privacy"
                    checked={watch('privacy')}
                    onCheckedChange={(checked) => setValue('privacy', !!checked, { shouldValidate: true })}
                    aria-describedby={errors.privacy ? 'error-privacy' : undefined}
                    data-testid="checkbox-privacy"
                  />
                  <label htmlFor="privacy" className="text-sm text-muted-foreground">
                    {t('contact.form.privacy')}{' '}
                  <a href="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">보기</a>
                  </label>
                </div>
                {errors.privacy && (
                  <p id="error-privacy" role="alert" className="text-sm text-destructive">{errors.privacy.message}</p>
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
                      <div className="text-sm text-muted-foreground">{t('contact.office.addressValue')}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                       <div className="font-medium text-foreground mb-1">{t('contact.office.phone')}</div>
                       <a href="tel:+82212345678" className="text-sm text-primary hover:underline">+82-2-1234-5678</a>
                      <div className="text-sm text-muted-foreground">{t('contact.office.weekdays')}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                       <div className="font-medium text-foreground mb-1">{t('contact.office.email')}</div>
                       <a href="mailto:info@kscc.kr" className="block text-sm text-primary hover:underline">info@kscc.kr</a>
                       <a href="mailto:support@kscc.kr" className="block text-sm text-primary hover:underline">support@kscc.kr</a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      {/* Social channels are omitted until real destinations are configured. */}
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
              
              {/* Office Map */}
              <Card className="overflow-hidden">
                <div className="border-b border-border bg-card p-6">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                    <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                    {t('contact.office.mapTitle')}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t('contact.office.addressValue')}</p>
                </div>
                <div className="relative aspect-[4/3] min-h-[16rem] w-full bg-muted sm:aspect-video">
                  <iframe
                    src={OFFICE_MAP_URL}
                    title={t('contact.office.mapTitle')}
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="space-y-2 bg-card p-4 text-sm">
                  <a
                    href={OFFICE_EXTERNAL_MAP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    {t('contact.office.openMap')}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {t('contact.office.mapAttribution')}{' '}
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      OpenStreetMap
                    </a>
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
