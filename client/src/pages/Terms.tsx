import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background dark:bg-background">
       <section className="page-banner bg-muted dark:bg-muted">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground dark:text-foreground sm:mb-4 sm:text-4xl">이용약관</h1>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground sm:text-lg">Terms of Service</p>
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
              <h2 className="text-2xl font-bold mb-4">제1조 (목적)</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                이 약관은 한국 사천-충칭 총상회(이하 "본 협회")가 운영하는 KSCC 포털(이하 "서비스")의 이용 조건 및 절차, 이용자와 본 협회의 권리·의무 및 책임사항에 관한 사항을 규정함을 목적으로 합니다.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">제2조 (정의)</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground dark:text-muted-foreground">
                <li>"서비스"란 본 협회가 제공하는 웹사이트 및 관련 서비스를 의미합니다.</li>
                <li>"이용자"란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 의미합니다.</li>
                <li>"회원"이란 서비스에 개인정보를 제공하여 회원등록을 한 자로서, 서비스의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 의미합니다.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">제3조 (약관의 효력 및 변경)</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                본 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다. 본 협회는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 공지합니다.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">제4조 (회원가입)</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                이용자는 본 협회가 정한 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다. 본 협회는 가입 자격 검토 후 서비스 이용을 허락합니다.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">제5조 (회원의 의무)</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground dark:text-muted-foreground">
                <li>회원은 서비스 이용 시 관련 법령 및 본 약관의 규정을 준수하여야 합니다.</li>
                <li>회원은 자신의 아이디와 비밀번호를 제3자에게 제공하거나 공유할 수 없습니다.</li>
                <li>회원은 허위 정보를 기재하거나 타인의 정보를 도용하는 행위를 하여서는 안 됩니다.</li>
                <li>회원은 서비스를 통해 얻은 정보를 본 협회의 동의 없이 영리 목적으로 이용하거나 제3자에게 유출하여서는 안 됩니다.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">제6조 (서비스 제공 및 변경)</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                본 협회는 회원에게 아래와 같은 서비스를 제공합니다: 회원 디렉토리, 뉴스 및 행사 정보, 자료실, 문의 서비스. 본 협회는 서비스의 내용을 변경할 수 있으며, 이 경우 변경된 서비스의 내용 및 제공일자를 명시하여 공지합니다.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">제7조 (책임 제한)</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                본 협회는 천재지변, 전쟁, 기간통신사업자의 서비스 중단 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임을 지지 않습니다.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">제8조 (분쟁 해결)</h2>
              <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed">
                본 약관에 관한 분쟁은 대한민국 법을 준거법으로 하며, 분쟁이 발생할 경우 서울중앙지방법원을 관할법원으로 합니다.
              </p>
            </div>

            <div className="border-t border-border dark:border-border pt-8">
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                문의사항은 info@kscc.kr로 연락주시기 바랍니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
