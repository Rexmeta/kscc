import { TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export function ManualTab() {
  return (
    <TabsContent value="manual" className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">KSCC 운영 매뉴얼</h2>
        <Badge variant="secondary">운영자 전용</Badge>
      </div>

      <div className="grid gap-6">
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">0. 목적 정의</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>한국-현지 기업 네트워킹</li>
            <li>투자/거래/협력 정보 제공</li>
            <li>현지 정부/기관 연결</li>
            <li>교민 비즈니스 지원</li>
          </ul>
          <p className="mt-3 text-sm font-medium text-destructive">이 목적에서 벗어나는 일은 하지 않는다.</p>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">1. 조직 구조</h3>
          <p className="font-medium">법적 형태: 비영리 사단법인</p>
          <p className="text-sm text-muted-foreground mb-4">회원구조: 개인·기업·기관</p>
          <p className="font-medium mb-2">핵심 인력:</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <span>• 회장 1</span>
            <span>• 부회장(재무) 1</span>
            <span>• 부회장(행사/프로그램) 1</span>
            <span>• 사무국장 1 (실무 책임)</span>
            <span>• 이사 3~7</span>
            <span>• 감사 1</span>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">2. 역할과 책임</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">회장</p>
              <p>조직의 대외 대표, 전략 수립 및 주요 의사결정</p>
            </div>
            <div>
              <p className="font-medium text-foreground">부회장(재무)</p>
              <p>회계 관리, 예산 수립, 재정 감시</p>
            </div>
            <div>
              <p className="font-medium text-foreground">부회장(행사/프로그램)</p>
              <p>행사 기획 및 실행, 프로그램 개발</p>
            </div>
            <div>
              <p className="font-medium text-foreground">사무국장</p>
              <p>일상 운영 총괄, 회원 관리, 행정 업무</p>
            </div>
            <div>
              <p className="font-medium text-foreground">이사</p>
              <p>주요 정책 결정, 감시 및 조언</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">3. 의사결정 및 거버넌스</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">총회 (연 1회)</p>
              <p>주요 사항 보고, 예산 심의, 임원 선출</p>
            </div>
            <div>
              <p className="font-medium text-foreground">이사회 (월 1회)</p>
              <p>중요 사업 결정, 예산 배분, 행사 승인</p>
            </div>
            <div>
              <p className="font-medium text-foreground">운영회의 (주 1회)</p>
              <p>실무진 회의, 현안 논의, 업무 분담</p>
            </div>
            <div>
              <p className="font-medium text-foreground">소위원회</p>
              <p>산업별, 분야별 전문위원회로 세부 사항 검토</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">4. 회원 관리</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">회원 등급</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>정회원: 기업 및 기관 (의결권 있음)</li>
                <li>준회원: 개인 및 소상공인 (의견 제시 권리)</li>
                <li>명예회원: 특별 공헌자</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">회원 혜택</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>정보 공유 및 네트워킹 기회</li>
                <li>행사 우선 참여권</li>
                <li>법률/재무 상담</li>
                <li>비즈니스 매칭 지원</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">회비</p>
              <p>정회원 연 기본 회비 + 추가 프로그램 참가비</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">5. 행사 및 프로그램 운영</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">정기 행사</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>분기별 경제 세미나</li>
                <li>상반/하반 정기 회의</li>
                <li>연례 신년회 및 송년회</li>
                <li>월별 회원 간담회</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">특별 프로그램</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>비즈니스 미션 및 현지 방문</li>
                <li>투자 설명회</li>
                <li>산업별 포럼</li>
                <li>온라인 교육 및 웨비나</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">행사 기획 프로세스</p>
              <p>기획 → 예산 승인 → 실행 → 결과 보고</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">6. 재정 및 회계 관리</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">재원</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>회비 (정회원, 준회원)</li>
                <li>행사 수수료</li>
                <li>후원금 및 기부금</li>
                <li>정부 지원금</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">예산 원칙</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>투명성 - 모든 수지 명시</li>
                <li>효율성 - 필수 사업에 집중</li>
                <li>공정성 - 회원 이익 최우선</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">결산</p>
              <p>연 1회 감사 실시, 총회에서 보고 및 승인</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">7. 대외 관계 및 파트너십</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">정부 기관 연계</p>
              <p>한국 및 현지 정부 기관과의 협력, 정책 건의</p>
            </div>
            <div>
              <p className="font-medium text-foreground">유관 기관 협력</p>
              <p>다른 상공회의소, 업계 협회와의 연대</p>
            </div>
            <div>
              <p className="font-medium text-foreground">기업 파트너십</p>
              <p>회원사 간 비즈니스 매칭, 합작투자 지원</p>
            </div>
            <div>
              <p className="font-medium text-foreground">미디어 관계</p>
              <p>뉴스 배포, 보도자료 관리, 회원 홍보</p>
            </div>
          </div>
        </div>

        <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50 dark:bg-blue-950">
          <h3 className="text-lg font-semibold mb-4">8. 결론</h3>
          <p className="text-center text-lg font-semibold mb-3">
            비영리는 <span className="text-blue-600 dark:text-blue-400">돈 버는 조직이 아니라 신뢰를 축적하는 조직</span>이다.
          </p>
          <p className="text-center text-muted-foreground">
            신뢰가 쌓이면 <strong>비즈니스·협력은 자연스럽게 따라온다.</strong>
          </p>
          <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded border-l-4 border-blue-500">
            <p className="text-sm font-medium text-foreground mb-2">KSCC 운영의 핵심 가치:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>투명성과 신뢰 우선</li>
              <li>회원의 이익과 발전</li>
              <li>한-중 경제 협력 증진</li>
              <li>윤리적 운영과 책임성</li>
            </ul>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
