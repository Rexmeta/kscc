import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background dark:bg-background">
       <section className="page-banner bg-muted dark:bg-muted">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground dark:text-foreground sm:mb-4 sm:text-4xl">개인정보처리방침</h1>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground sm:text-lg">Privacy Policy</p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-4xl">
          <div className="mb-8">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                홈으로 돌아가기
              </Button>
            </Link>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 text-foreground dark:text-foreground">
            <div>
              <p className="text-muted-foreground dark:text-muted-foreground text-sm">최종 업데이트: 2024년 1월 1일</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">1. 개인정보 수집 및 이용 목적</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                한국 사천-충칭 총상회(이하 "본 협회")는 회원 서비스 제공, 행사 안내, 뉴스레터 발송, 회원 관리 등의 목적으로 개인정보를 수집·이용합니다.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">2. 수집하는 개인정보 항목</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground dark:text-muted-foreground">
                <li>필수항목: 이름, 이메일 주소, 비밀번호</li>
                <li>선택항목: 회사명, 직책, 전화번호, WeChat ID, 사업 내용</li>
                <li>자동수집: 접속 IP, 쿠키, 서비스 이용 기록</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">3. 개인정보 보유 및 이용 기간</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                회원 탈퇴 시 또는 수집·이용 목적이 달성된 후 해당 정보를 지체 없이 파기합니다. 단, 관련 법령에 의해 보존할 필요가 있는 경우 해당 기간 동안 보존합니다.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">4. 개인정보의 제3자 제공</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                본 협회는 원칙적으로 회원의 개인정보를 외부에 제공하지 않습니다. 다만, 회원의 동의가 있거나 법령의 규정에 의한 경우에는 예외로 합니다.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">5. 개인정보 보호책임자</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                개인정보 처리에 관한 업무를 총괄하고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>
              <div className="mt-4 p-4 bg-muted dark:bg-muted rounded-lg">
                <p className="font-medium text-foreground dark:text-foreground">개인정보 보호책임자</p>
                <p className="text-muted-foreground dark:text-muted-foreground">이메일: info@kscc.kr</p>
                <p className="text-muted-foreground dark:text-muted-foreground">전화: +82-2-1234-5678</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">6. 정보주체의 권리</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                회원은 언제든지 자신의 개인정보를 조회, 수정, 삭제, 처리 정지를 요구할 수 있습니다. 위 권리 행사는 info@kscc.kr로 이메일을 통해 요청하실 수 있습니다.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">7. 쿠키 운용</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                본 협회는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다. 이용자는 웹브라우저 옵션 설정을 통해 쿠키 허용 여부를 선택할 수 있습니다.
              </p>
            </div>

            <div className="border-t border-border dark:border-border pt-8">
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                본 개인정보처리방침은 법령 및 지침의 변경, 또는 내부 운영 방침의 변경에 따라 수정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
