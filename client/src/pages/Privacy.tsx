import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  POLICY_EFFECTIVE_DATE,
} from '@shared/policies';
import type { Language } from '@/lib/i18n';

interface PolicyCopy {
  title: string;
  subtitle: string;
  back: string;
  versionLabel: string;
  effectiveDateLabel: string;
  notice: string;
  sections: Array<{
    heading: string;
    paragraphs?: string[];
    bullets?: string[];
  }>;
  footer: string;
}

const policyCopy: Record<Language, PolicyCopy> = {
  ko: {
    title: '개인정보처리방침',
    subtitle: 'Privacy Policy',
    back: '홈으로 돌아가기',
    versionLabel: '정책 버전',
    effectiveDateLabel: '시행일',
    notice: '이 방침은 현재 KSCC 포털에서 실제로 제공하는 가입·회원사·행사·문의 기능을 기준으로 작성된 운영 안내입니다. 법률 검토 및 최종 승인이 필요한 항목은 책임자 확인 후 별도 공지합니다.',
    sections: [
      {
        heading: '1. 개인정보의 처리 목적과 법적 근거',
        bullets: [
          '계정: 이름, 이메일, 비밀번호(복호화할 수 없는 해시 형태), 선택적 WeChat ID를 계정 생성·인증과 회원 서비스 제공을 위해 처리합니다. 계정 생성에 필요한 처리는 서비스 이용계약 이행을 근거로 하며, WeChat ID는 이용자가 제공한 경우에만 처리합니다.',
          '회원사: 회사명, 업종, 국가·도시·주소, 담당자 및 연락처 등 회원사 프로필을 회원 승인·관리와 회원 디렉터리 운영을 위해 처리합니다. 공개 여부와 공개 범위는 별도로 관리합니다.',
          '행사 등록: 등록자의 이름, 이메일, 선택적 전화번호·회사명과 계정 식별자를 행사 신청·정원 관리·참석 확인에 사용합니다.',
          '문의: 이름, 이메일, 선택적 전화번호·회사명, 문의 분류·제목·내용을 문의 접수·답변과 중복 접수 방지에 사용합니다. 문의 제출은 이 방침에 대한 별도 동의를 근거로 합니다.',
        ],
      },
      {
        heading: '2. 처리하는 항목과 필수·선택 여부',
        bullets: [
          '가입 필수: 이름, 이메일, 비밀번호, 이용약관 동의, 계정 개인정보 처리 동의. 선택: WeChat ID.',
          '회원사 프로필: 회사명, 업종, 국가, 도시, 주소, 담당자, 담당자 이메일은 회원사 등록·관리에 필요한 항목입니다. 전화번호와 웹사이트·소개·다국어 소개·로고는 제공되는 경우 처리합니다.',
          '행사 등록 필수: 행사 등록자 이름과 이메일. 선택: 전화번호와 회사명.',
          '문의 필수: 분류, 이름, 이메일, 제목, 내용. 선택: 전화번호와 회사명. 문의 동의는 선택할 수 없으며 제출에 필요합니다.',
          '브라우저 저장소: 로그인 세션 토큰은 브라우저 localStorage에 저장될 수 있습니다. 현재 별도의 광고 쿠키나 분석 쿠키를 사용하지 않습니다.',
        ],
      },
      {
        heading: '3. 보유기간과 파기',
        paragraphs: [
          '개인정보는 각 목적에 필요한 동안 보유합니다. 계정·회원사 정보는 탈퇴 또는 회원사 처리 목적이 끝난 때, 행사 등록 정보는 행사 운영과 사후 확인에 필요한 때, 문의 정보는 답변과 처리 이력 관리에 필요한 때까지 보유합니다. 법령상 보존이 필요한 경우에는 해당 기간 동안 보존합니다.',
          '보유기간이 끝나거나 목적이 달성되면 지체 없이 파기합니다. 전자 파일은 복구하기 어려운 방법으로 삭제하고, 별도 법령상 보존 항목은 보존기간 종료 후 파기합니다. 세부 보존기간과 문의 연락처 정리 절차는 운영 보존정책에 따라 관리합니다.',
        ],
      },
      {
        heading: '4. 외부 처리자와 국외 처리',
        bullets: [
          'Resend: 문의 답변 이메일을 보내는 경우 수신자 이메일과 답변에 필요한 문의·답변 내용이 Resend를 통해 전송될 수 있습니다. 이메일 기능이 설정된 경우에만 사용합니다.',
          'Object Storage: 포털에 업로드되는 게시물·회원사 이미지와 자료 파일을 저장하는 데 사용합니다. 파일 접근 권한은 포털의 공개·회원 전용 설정에 따릅니다.',
          '외부 설문 플랫폼: 로그인한 회원이 활성 설문 링크를 선택하면 외부 설문 서비스로 이동합니다. 설문 자체의 수집과 처리방침은 해당 서비스가 정하며, 포털은 설문 플랫폼의 응답을 수집하지 않습니다.',
          'OpenStreetMap: 연락처 페이지의 지도 iframe 또는 외부 지도 링크를 이용하면 브라우저 요청이 지도 제공자에 전송될 수 있습니다. 지도 제공자의 정책을 확인한 뒤 이용해 주세요.',
        ],
      },
      {
        heading: '5. 제3자 제공과 선택적 마케팅',
        paragraphs: [
          '법령에 근거하거나 정보주체의 별도 동의가 있는 경우를 제외하고 개인정보를 제3자에게 판매·제공하지 않습니다. 현재 뉴스레터, 광고 타기팅, 마케팅 메시지 발송 기능은 제공하지 않으므로 선택적 마케팅 동의를 별도로 받거나 관리하지 않습니다.',
        ],
      },
      {
        heading: '6. 정보주체의 권리와 행사 방법',
        paragraphs: [
          '정보주체는 개인정보 열람, 정정, 삭제, 처리정지 및 동의 철회를 요청할 수 있습니다. 계정 정보는 로그인 후 제공되는 프로필 기능으로 직접 수정할 수 있으며, 그 밖의 요청은 info@kscc.kr로 보내 주세요. 요청자의 본인 여부를 확인한 후 관련 법령이 정한 범위와 기간에 따라 처리합니다.',
        ],
      },
      {
        heading: '7. 개인정보 보호책임자',
        paragraphs: [
          '개인정보 처리에 관한 문의, 불만 처리 및 피해 구제 요청은 아래 담당자에게 연락해 주세요.',
          '한국 사천-충칭 총상회 개인정보 보호책임자 · info@kscc.kr · +82-2-1234-5678',
        ],
      },
    ],
    footer: '처리 흐름이나 정책이 변경되면 변경된 버전과 시행일을 이 페이지에서 확인할 수 있도록 공지합니다.',
  },
  en: {
    title: 'Privacy Policy',
    subtitle: '개인정보처리방침 · 隐私政策',
    back: 'Back to home',
    versionLabel: 'Policy version',
    effectiveDateLabel: 'Effective date',
    notice: 'This notice describes the account, member company, event, and inquiry features currently provided by the KSCC portal. Items requiring legal review and final approval will be separately announced after the responsible person confirms them.',
    sections: [
      {
        heading: '1. Purposes and legal bases',
        bullets: [
          'Accounts: We process your name, email, a non-reversible password hash, and an optional WeChat ID to create and authenticate an account and provide member services. Account processing is based on the service agreement; a WeChat ID is processed only when you provide it.',
          'Member companies: We process company name, industry, country, city, address, contact person, and contact details for approval, administration, and the member directory. Publication status and scope are managed separately.',
          'Event registration: We use attendee name, email, and optional phone/company details plus the account identifier for registration, capacity management, and attendance confirmation.',
          'Inquiries: We use name, email, optional phone/company details, category, subject, and message to receive and answer inquiries and prevent duplicate submissions. Submission requires separate consent to this policy.',
        ],
      },
      {
        heading: '2. Data items and required or optional status',
        bullets: [
          'Required for signup: name, email, password, Terms consent, and account privacy consent. Optional: WeChat ID.',
          'Member profile: company name, industry, country, city, address, contact person, and contact email are used for member administration. Phone, website, descriptions, translations, and logo are processed when provided.',
          'Required for event registration: attendee name and email. Optional: phone and company name.',
          'Required for inquiries: category, name, email, subject, and message. Optional: phone and company name. Inquiry consent is required to submit.',
          'Browser storage: a login session token may be stored in browser localStorage. We do not currently use separate advertising or analytics cookies.',
        ],
      },
      {
        heading: '3. Retention and deletion',
        paragraphs: [
          'We retain personal information while it is needed for the relevant purpose. Account and member information is retained until account withdrawal or completion of member administration; event registrations until event operations and follow-up confirmation are complete; and inquiries until response and case-history administration are complete. Statutory retention periods take precedence.',
          'When the purpose or retention period ends, information is deleted without undue delay. Electronic records are deleted in a way that makes recovery difficult. Detailed retention periods and inquiry-contact cleanup procedures are managed under the operational retention policy.',
        ],
      },
      {
        heading: '4. Processors and international processing',
        bullets: [
          'Resend: when an inquiry reply email is sent, the recipient email and content needed for the reply may be transmitted through Resend. It is used only when email delivery is configured.',
          'Object Storage: uploaded post, member-company image, and resource files are stored there. Access follows the portal’s public or member-only settings.',
          'External survey platform: selecting an active survey while signed in takes you to an external survey service. That service controls its own survey collection and policy; the portal does not collect survey responses.',
          'OpenStreetMap: loading the contact-page map iframe or external map link may send a browser request to the map provider. Review that provider’s policy before using the map.',
        ],
      },
      {
        heading: '5. Sharing and optional marketing',
        paragraphs: [
          'We do not sell or provide personal information to third parties unless required by law or separately authorized by you. The portal currently has no newsletter, advertising targeting, or marketing-message feature, so we do not collect or manage a separate optional marketing consent.',
        ],
      },
      {
        heading: '6. Your rights',
        paragraphs: [
          'You may request access, correction, deletion, restriction of processing, or withdrawal of consent. You can update account information through the profile feature after signing in, or contact info@kscc.kr for other requests. We verify the requester’s identity and respond within the scope and period required by law.',
        ],
      },
      {
        heading: '7. Privacy contact',
        paragraphs: [
          'For privacy questions, complaints, or requests for remedies, contact the Korea Sichuan-Chongqing Chamber of Commerce privacy contact at info@kscc.kr or +82-2-1234-5678.',
        ],
      },
    ],
    footer: 'When processing or this policy changes, the new version and effective date will be announced on this page.',
  },
  zh: {
    title: '隐私政策',
    subtitle: '개인정보처리방침 · Privacy Policy',
    back: '返回首页',
    versionLabel: '政策版本',
    effectiveDateLabel: '生效日期',
    notice: '本政策根据 KSCC 门户目前提供的账户、会员企业、活动报名和咨询功能编写。需要负责人确认的法律审查及最终批准事项，将在确认后另行公告。',
    sections: [
      {
        heading: '1. 处理目的与依据',
        bullets: [
          '账户：处理姓名、电子邮箱、不可逆的密码哈希及可选的 WeChat ID，用于创建账户、身份验证和提供会员服务。账户处理以服务协议为依据；仅在您主动提供时处理 WeChat ID。',
          '会员企业：处理公司名称、行业、国家、城市、地址、联系人及联系方式，用于审核、管理和会员目录。公开状态和范围单独管理。',
          '活动报名：使用报名者姓名、电子邮箱以及可选的电话、公司名称和账户标识，用于报名、名额管理及出席确认。',
          '咨询：使用姓名、电子邮箱、可选的电话和公司名称、分类、主题和内容，用于接收和回复咨询并防止重复提交。提交咨询需要单独同意本政策。',
        ],
      },
      {
        heading: '2. 信息项目及必选、可选状态',
        bullets: [
          '注册必填：姓名、电子邮箱、密码、服务条款同意和账户隐私同意。可选：WeChat ID。',
          '会员资料：公司名称、行业、国家、城市、地址、联系人和联系人邮箱用于会员管理；电话、网站、介绍、翻译内容和标志在提供时处理。',
          '活动报名必填：报名者姓名和电子邮箱。可选：电话和公司名称。',
          '咨询必填：分类、姓名、电子邮箱、主题和内容。可选：电话和公司名称。咨询同意是提交所必需的。',
          '浏览器存储：登录会话令牌可能存储在浏览器 localStorage 中。目前不使用单独的广告或分析 Cookie。',
        ],
      },
      {
        heading: '3. 保存期限与删除',
        paragraphs: [
          '个人信息仅在相关目的所需期间保存。账户和会员信息保存至注销或会员管理目的完成；活动报名信息保存至活动运营及后续确认完成；咨询信息保存至答复及处理记录管理完成。法律规定的保存期限优先适用。',
          '目的或保存期限结束后，我们会及时删除信息。电子记录将以难以恢复的方式删除。具体保存期限和咨询联系方式清理程序按照运营保存政策管理。',
        ],
      },
      {
        heading: '4. 外部处理方与境外处理',
        bullets: [
          'Resend：发送咨询回复邮件时，收件人邮箱及回复所需内容可能通过 Resend 传输；仅在配置邮件功能时使用。',
          'Object Storage：用于保存上传的文章、会员企业图片和资料文件。访问权限遵循门户的公开或会员专属设置。',
          '外部问卷平台：登录会员选择有效问卷后会跳转到外部问卷服务。问卷收集及其政策由该服务负责；门户不收集问卷回答。',
          'OpenStreetMap：加载联系页面地图 iframe 或外部地图链接时，浏览器请求可能发送给地图提供方。使用地图前请查看该提供方的政策。',
        ],
      },
      {
        heading: '5. 提供及可选营销',
        paragraphs: [
          '除法律要求或取得单独同意外，我们不会出售或向第三方提供个人信息。目前门户不提供新闻通讯、广告定向或营销消息功能，因此不单独收集或管理可选营销同意。',
        ],
      },
      {
        heading: '6. 信息主体权利',
        paragraphs: [
          '您可以请求查阅、更正、删除、限制处理或撤回同意。登录后可通过个人资料功能修改账户信息，其他请求请发送至 info@kscc.kr。我们会核实请求者身份，并在法律规定的范围和期限内处理。',
        ],
      },
      {
        heading: '7. 隐私负责人',
        paragraphs: [
          '如有隐私问题、投诉或救济请求，请联系韩国四川-重庆总商会隐私负责人：info@kscc.kr，+82-2-1234-5678。',
        ],
      },
    ],
    footer: '处理流程或政策发生变化时，本页面将公布新的版本和生效日期。',
  },
};

export default function PrivacyPage() {
  const { language } = useLanguage();
  const copy = policyCopy[language];

  return (
    <div className="min-h-screen bg-background">
      <section className="page-banner bg-muted">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground sm:mb-4 sm:text-4xl">{copy.title}</h1>
            <p className="text-sm text-muted-foreground sm:text-lg">{copy.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-4xl">
          <div className="mb-8">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {copy.back}
              </Button>
            </Link>
          </div>

          <article className="prose prose-lg dark:prose-invert max-w-none space-y-8 text-foreground">
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <div className="flex flex-wrap gap-x-6 gap-y-1 font-medium text-foreground">
                <span>{copy.versionLabel}: {CURRENT_PRIVACY_POLICY_VERSION}</span>
                <span>{copy.effectiveDateLabel}: {POLICY_EFFECTIVE_DATE}</span>
              </div>
              <p className="mt-3 leading-relaxed">{copy.notice}</p>
            </div>

            {copy.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="mb-4 text-2xl font-bold">{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mb-3 leading-relaxed text-muted-foreground">{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </section>
            ))}

            <div className="border-t border-border pt-8">
              <p className="text-sm text-muted-foreground">{copy.footer}</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}