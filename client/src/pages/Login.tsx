import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다').max(72, '비밀번호는 72자 이내여야 합니다'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
      });
      setLocation('/dashboard');
    } catch (error) {
      toast({
        title: "로그인 실패",
        description: "이메일 또는 비밀번호를 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-start justify-center bg-muted/30 px-4 py-2 dark:bg-muted/10 sm:py-4 md:min-h-[calc(100dvh-5rem)]">
      <div className="container">
        <div className="mx-auto max-w-md">
          <Card className="dark:bg-card dark:border-border">
           <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-center text-foreground dark:text-foreground">{t('auth.login.title')}</CardTitle>
            </CardHeader>
             <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
               <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="email">{t('auth.login.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      className="pl-10"
                      {...register('email')}
                      data-testid="input-email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="password">{t('auth.login.password')}</Label>
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-sm text-primary hover:underline"
                      data-testid="button-forgot-password"
                    >
                      비밀번호 찾기
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...register('password')}
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                  data-testid="button-login"
                >
                  {isSubmitting ? '로그인 중...' : t('auth.login.submit')}
                </Button>
              </form>
              
               <div className="mt-4 text-center sm:mt-6">
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  아직 계정이 없으신가요?{' '}
                  <Link href="/register" className="text-primary hover:underline">
                    {t('auth.login.register')}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="max-w-md dark:bg-card dark:border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground">비밀번호 찾기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
              비밀번호를 잊어버리셨나요? 아래 방법으로 관리자에게 연락하시면 비밀번호를 재설정해 드립니다.
            </p>
            <div className="rounded-lg bg-muted dark:bg-muted p-4 space-y-2">
              <p className="font-medium text-foreground dark:text-foreground">관리자 연락처</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">이메일: info@kscc.kr</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">전화: +82-2-1234-5678</p>
            </div>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              이메일로 문의 시 가입하신 이메일 주소와 이름을 함께 알려주세요.
            </p>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setForgotPasswordOpen(false)}
                data-testid="button-close-forgot-password"
              >
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
