import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, User, Mail, Lock, Building, Briefcase, Phone, MessageCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';
import { submitRegistration } from '@/lib/registerFlow';

const companySchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  confirmPassword: z.string(),
  weixin: z.string().optional(),
  companyName: z.string().optional(),
  business: z.string().optional(),
  contactEmail: z.string().email('올바른 이메일을 입력해주세요').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof companySchema>;

export default function RegisterPage() {
  const [userType, setUserType] = useState<'staff' | 'company'>('staff');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { register: registerUser } = useAuth();
  const { toast } = useToast();

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      weixin: '',
      companyName: '',
      business: '',
      contactEmail: '',
      contactPhone: '',
    },
  });

  const handleTabChange = (value: string) => {
    setUserType(value as 'staff' | 'company');
  };

  const onSubmit = async (data: RegisterForm) => {
    if (userType === 'company') {
      let hasError = false;
      if (!data.companyName || data.companyName.length < 2) {
        setError('companyName', { type: 'manual', message: '회사명은 2자 이상이어야 합니다' });
        hasError = true;
      }
      if (!data.business || data.business.length < 2) {
        setError('business', { type: 'manual', message: '사업 내용을 입력해주세요' });
        hasError = true;
      }
      if (hasError) return;
    }

    await submitRegistration({
      data,
      userType,
      registerUser: registerUser,
      toast,
      setLocation,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 dark:bg-muted/10 py-12">
      <div className="container">
        <div className="mx-auto max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href="/">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <span className="text-2xl font-bold text-white">KSCC</span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-foreground dark:text-foreground">{t('auth.register.title')}</h1>
            <p className="text-muted-foreground dark:text-muted-foreground">새 계정을 만들어 시작하세요</p>
          </div>

          <Card className="dark:bg-card dark:border-border">
            <CardHeader>
              <CardTitle className="text-center text-foreground dark:text-foreground">{t('auth.register.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={userType} onValueChange={handleTabChange} className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="staff" data-testid="tab-staff">운영진</TabsTrigger>
                  <TabsTrigger value="company" data-testid="tab-company">회원사</TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('auth.register.name')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="홍길동"
                      className="pl-10"
                      {...register('name')}
                      data-testid="input-name"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email">{t('auth.register.email')}</Label>
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
                  <Label htmlFor="password">{t('auth.register.password')}</Label>
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
                
                <div>
                  <Label htmlFor="confirmPassword">{t('auth.register.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...register('confirmPassword')}
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="weixin">WeChat ID (선택)</Label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="weixin"
                      placeholder="WeChat ID"
                      className="pl-10"
                      {...register('weixin')}
                      data-testid="input-weixin"
                    />
                  </div>
                </div>

                {userType === 'company' && (
                  <>
                    <div>
                      <Label htmlFor="companyName">회사명 *</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="companyName"
                          placeholder="주식회사 예시"
                          className="pl-10"
                          {...register('companyName')}
                          data-testid="input-company-name"
                        />
                      </div>
                      {errors.companyName && (
                        <p className="text-sm text-destructive mt-1">{errors.companyName.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="business">사업 내용 *</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="business"
                          placeholder="무역, 제조업 등"
                          className="pl-10"
                          {...register('business')}
                          data-testid="input-business"
                        />
                      </div>
                      {errors.business && (
                        <p className="text-sm text-destructive mt-1">{errors.business.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="contactEmail">담당자 이메일 (선택)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="contactEmail"
                          type="email"
                          placeholder="contact@company.com"
                          className="pl-10"
                          {...register('contactEmail')}
                          data-testid="input-contact-email"
                        />
                      </div>
                      {errors.contactEmail && (
                        <p className="text-sm text-destructive mt-1">{errors.contactEmail.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="contactPhone">담당자 전화번호 (선택)</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="contactPhone"
                          type="tel"
                          placeholder="010-1234-5678"
                          className="pl-10"
                          {...register('contactPhone')}
                          data-testid="input-contact-phone"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                  data-testid="button-register"
                >
                  {isSubmitting ? '가입 중...' : t('auth.register.submit')}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  이미 계정이 있으신가요?{' '}
                  <Link href="/login" className="text-primary hover:underline">
                    {t('auth.register.login')}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
