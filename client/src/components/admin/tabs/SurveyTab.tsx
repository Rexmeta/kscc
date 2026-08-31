import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ClipboardList } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAdminSurvey } from '@/hooks/useAdminData';
import { surveySettingsSchema, type SurveySettingsInput } from '@shared/schema';

const defaultValues: SurveySettingsInput = {
  title: '',
  description: '',
  externalUrl: '',
  isActive: false,
};

export function SurveyTab({ activeTab }: { activeTab: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = useAdminSurvey(activeTab);
  const form = useForm<SurveySettingsInput>({
    resolver: zodResolver(surveySettingsSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!settings) return;
    form.reset({
      title: settings.title || '',
      description: settings.description || '',
      externalUrl: settings.externalUrl || '',
      isActive: settings.isActive,
    });
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: SurveySettingsInput) => {
      const response = await apiRequest('PUT', '/api/admin/survey', data);
      return response.json();
    },
    onSuccess: (savedSettings) => {
      form.reset({
        title: savedSettings.title || '',
        description: savedSettings.description || '',
        externalUrl: savedSettings.externalUrl || '',
        isActive: savedSettings.isActive,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/survey'] });
      queryClient.invalidateQueries({ queryKey: ['/api/survey'] });
      toast({ title: '설문 설정이 저장되었습니다.' });
    },
    onError: (error) => {
      toast({
        title: '설문 설정 저장 실패',
        description: error instanceof Error ? error.message : '설정 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  return (
    <TabsContent value="survey" className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>회원 설문 설정</CardTitle>
              <CardDescription>
                로그인한 회원에게 메인 화면에서 안내할 외부 설문을 설정합니다.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="max-w-2xl space-y-5">
            <div>
              <label htmlFor="survey-title" className="form-label">설문 제목</label>
              <Input id="survey-title" {...form.register('title')} data-testid="input-survey-title" />
              {form.formState.errors.title && (
                <p className="mt-1 text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="survey-description" className="form-label">간단한 소개</label>
              <Textarea
                id="survey-description"
                rows={4}
                {...form.register('description')}
                data-testid="textarea-survey-description"
              />
              {form.formState.errors.description && (
                <p className="mt-1 text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="survey-url" className="form-label">외부 설문 링크</label>
              <Input
                id="survey-url"
                type="url"
                placeholder="https://forms.example.com/..."
                {...form.register('externalUrl')}
                data-testid="input-survey-url"
              />
              <p className="mt-1 text-xs text-muted-foreground">외부 설문 플랫폼의 HTTPS 링크만 입력할 수 있습니다.</p>
              {form.formState.errors.externalUrl && (
                <p className="mt-1 text-sm text-destructive">{form.formState.errors.externalUrl.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">설문 노출</p>
                <p className="text-sm text-muted-foreground">활성화하면 로그인 회원에게 메인 화면에 표시됩니다.</p>
              </div>
              <Switch
                checked={form.watch('isActive')}
                onCheckedChange={(checked) => form.setValue('isActive', checked, { shouldValidate: true })}
                data-testid="switch-survey-active"
              />
            </div>

            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-survey">
              {saveMutation.isPending ? '저장 중...' : '설정 저장'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </TabsContent>
  );
}