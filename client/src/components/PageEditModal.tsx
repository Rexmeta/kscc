import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Save, X } from 'lucide-react';
import type { PostWithTranslations } from '@shared/schema';

interface PageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: PostWithTranslations;
}

interface TranslationFormData {
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
}

export default function PageEditModal({ isOpen, onClose, page }: PageEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeLocale, setActiveLocale] = useState<'ko' | 'en' | 'zh'>('ko');

  const getTranslation = (locale: string) => {
    return page.translations.find(t => t.locale === locale);
  };

  const [formData, setFormData] = useState<Record<string, TranslationFormData>>({
    ko: { title: '', subtitle: '', excerpt: '', content: '' },
    en: { title: '', subtitle: '', excerpt: '', content: '' },
    zh: { title: '', subtitle: '', excerpt: '', content: '' },
  });

  useEffect(() => {
    if (page) {
      const newFormData: Record<string, TranslationFormData> = {};
      ['ko', 'en', 'zh'].forEach(locale => {
        const translation = getTranslation(locale);
        newFormData[locale] = {
          title: translation?.title || '',
          subtitle: translation?.subtitle || '',
          excerpt: translation?.excerpt || '',
          content: translation?.content || '',
        };
      });
      setFormData(newFormData);
    }
  }, [page]);

  const updateMutation = useMutation({
    mutationFn: async (data: { locale: string; translationData: TranslationFormData }) => {
      const existingTranslation = getTranslation(data.locale);
      
      if (existingTranslation) {
        const response = await apiRequest('POST', `/api/posts/${page.id}/translations`, {
          ...data.translationData,
          locale: data.locale,
        });
        return response.json();
      } else {
        const response = await apiRequest('POST', `/api/posts/${page.id}/translations`, {
          ...data.translationData,
          locale: data.locale,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts/slug', page.slug] });
    },
  });

  const handleSave = async () => {
    try {
      const promises = Object.entries(formData).map(([locale, translationData]) => 
        updateMutation.mutateAsync({ locale, translationData })
      );
      
      await Promise.all(promises);
      
      toast({
        title: '저장 완료',
        description: '페이지 콘텐츠가 성공적으로 저장되었습니다.',
      });
      onClose();
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '페이지 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (locale: string, field: keyof TranslationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [locale]: {
        ...prev[locale],
        [field]: value,
      },
    }));
  };

  const parseContent = (contentStr: string) => {
    try {
      return JSON.parse(contentStr);
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            페이지 편집: {page.slug}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as 'ko' | 'en' | 'zh')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ko">한국어</TabsTrigger>
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="zh">中文</TabsTrigger>
          </TabsList>

          {(['ko', 'en', 'zh'] as const).map((locale) => (
            <TabsContent key={locale} value={locale} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor={`title-${locale}`}>제목</Label>
                <Input
                  id={`title-${locale}`}
                  value={formData[locale]?.title || ''}
                  onChange={(e) => handleInputChange(locale, 'title', e.target.value)}
                  placeholder="페이지 제목"
                  data-testid={`input-title-${locale}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`subtitle-${locale}`}>부제목</Label>
                <Input
                  id={`subtitle-${locale}`}
                  value={formData[locale]?.subtitle || ''}
                  onChange={(e) => handleInputChange(locale, 'subtitle', e.target.value)}
                  placeholder="페이지 부제목"
                  data-testid={`input-subtitle-${locale}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`excerpt-${locale}`}>요약</Label>
                <Textarea
                  id={`excerpt-${locale}`}
                  value={formData[locale]?.excerpt || ''}
                  onChange={(e) => handleInputChange(locale, 'excerpt', e.target.value)}
                  placeholder="페이지 요약"
                  rows={2}
                  data-testid={`input-excerpt-${locale}`}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`content-${locale}`} className="font-semibold">
                    콘텐츠 (JSON 형식)
                  </Label>
                  <span className="text-xs text-muted-foreground">구조화된 데이터</span>
                </div>
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-4">
                  <Textarea
                    id={`content-${locale}`}
                    value={formData[locale]?.content || ''}
                    onChange={(e) => handleInputChange(locale, 'content', e.target.value)}
                    placeholder={`{\n  "section1": "내용을 입력하세요",\n  "section2": "이렇게 구조화된 형식으로"\n}`}
                    rows={18}
                    className="font-mono text-sm bg-white dark:bg-slate-950 rounded border-0 resize-none"
                    data-testid={`input-content-${locale}`}
                  />
                </div>
                <div className="space-y-1 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
                    💡 JSON 형식 가이드
                  </p>
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    객체 형식으로 섹션을 구성하세요: {"{"}"key": "value"{"}"} 또는 배열 형식도 사용 가능합니다.
                  </p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel">
            <X className="h-4 w-4 mr-2" />
            취소
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            data-testid="button-save"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
