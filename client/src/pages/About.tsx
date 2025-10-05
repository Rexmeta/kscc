import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Lightbulb, Download, Users } from 'lucide-react';
import { t } from '@/lib/i18n';

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-muted py-16">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">{t('about.title')}</h1>
            <p className="text-lg text-muted-foreground">About KSCC / 关于商会</p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container">
          <div className="mb-16 grid gap-12 md:grid-cols-2">
            <Card className="p-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-foreground">{t('about.mission.title')}</h3>
              <p className="leading-relaxed text-muted-foreground mb-6">
                {t('about.mission.description')}
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-primary">✓</span>
                  <span className="text-sm">경제·무역 교류 활성화</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary">✓</span>
                  <span className="text-sm">문화·인적 네트워크 구축</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary">✓</span>
                  <span className="text-sm">비즈니스 기회 창출</span>
                </div>
              </div>
            </Card>
            
            <Card className="p-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-secondary/10">
                <Lightbulb className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-foreground">{t('about.vision.title')}</h3>
              <p className="leading-relaxed text-muted-foreground mb-6">
                {t('about.vision.description')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <div className="mb-1 text-lg font-bold text-primary">{t('about.values.trust')}</div>
                  <div className="text-xs text-muted-foreground">Trust</div>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <div className="mb-1 text-lg font-bold text-accent">{t('about.values.cooperation')}</div>
                  <div className="text-xs text-muted-foreground">Cooperation</div>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <div className="mb-1 text-lg font-bold text-secondary">{t('about.values.innovation')}</div>
                  <div className="text-xs text-muted-foreground">Innovation</div>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <div className="mb-1 text-lg font-bold text-primary">{t('about.values.growth')}</div>
                  <div className="text-xs text-muted-foreground">Growth</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Organization Chart */}
      <section className="bg-muted py-16">
        <div className="container">
          <Card className="p-8">
            <h3 className="mb-6 text-center text-2xl font-bold text-foreground">{t('about.organization.title')}</h3>
            
            {/* President */}
            <div className="mb-8 flex justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                  <Users className="h-12 w-12 text-white" />
                </div>
                <div className="text-lg font-bold">김철수</div>
                <div className="text-sm text-muted-foreground">{t('about.organization.president')} / President</div>
                <div className="mt-1 text-xs text-muted-foreground">㈜한중무역 대표이사</div>
              </div>
            </div>
            
            {/* Leadership Team */}
            <div className="grid gap-6 md:grid-cols-4">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div className="font-bold">이영희</div>
                <div className="text-sm text-muted-foreground">수석부회장</div>
                <div className="mt-1 text-xs text-muted-foreground">글로벌무역㈜</div>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div className="font-bold">박민수</div>
                <div className="text-sm text-muted-foreground">{t('about.organization.vicePresident')}</div>
                <div className="mt-1 text-xs text-muted-foreground">아시아물류㈜</div>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div className="font-bold">정수진</div>
                <div className="text-sm text-muted-foreground">{t('about.organization.secretary')}</div>
                <div className="mt-1 text-xs text-muted-foreground">KSCC 사무국</div>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div className="font-bold">왕리</div>
                <div className="text-sm text-muted-foreground">{t('about.organization.advisor')}</div>
                <div className="mt-1 text-xs text-muted-foreground">사천성 상무청</div>
              </div>
            </div>
            
            {/* Download Bylaws */}
            <div className="mt-8 text-center">
              <Button variant="outline" data-testid="button-download-bylaws">
                <Download className="h-4 w-4" />
                정관 다운로드
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
