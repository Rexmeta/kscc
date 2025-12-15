import { Link } from 'wouter';
import { t } from '@/lib/i18n';
import { Building2, Phone, Mail, Clock, MessageSquare, Youtube, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-foreground text-white py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent flex-shrink-0">
                <span className="text-lg font-bold text-white leading-none">KSCC</span>
              </div>
              <div>
                <div className="font-bold">한국 사천-충칭 총상회</div>
                <div className="text-xs opacity-75">Korea Sichuan-Chongqing</div>
              </div>
            </div>
            <p className="text-sm opacity-75 leading-relaxed">
              한·중 경제문화 교류의 중심<br />
              Building Bridges Between Korea & China
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-4">빠른 링크</h4>
            <nav className="space-y-2 text-sm">
              <Link href="/about" className="block opacity-75 hover:opacity-100 transition-opacity">
                {t('nav.about')}
              </Link>
              <Link href="/news" className="block opacity-75 hover:opacity-100 transition-opacity">
                {t('nav.news')}
              </Link>
              <Link href="/events" className="block opacity-75 hover:opacity-100 transition-opacity">
                {t('nav.events')}
              </Link>
              <Link href="/members" className="block opacity-75 hover:opacity-100 transition-opacity">
                {t('nav.members')}
              </Link>
              <Link href="/resources" className="block opacity-75 hover:opacity-100 transition-opacity">
                {t('nav.resources')}
              </Link>
            </nav>
          </div>

          {/* Member Services */}
          <div>
            <h4 className="font-bold mb-4">회원 서비스</h4>
            <nav className="space-y-2 text-sm">
              <Link href="/login" className="block opacity-75 hover:opacity-100 transition-opacity">
                {t('nav.login')}
              </Link>
              <Link href="/register" className="block opacity-75 hover:opacity-100 transition-opacity">
                {t('nav.register')}
              </Link>
              <Link href="/dashboard" className="block opacity-75 hover:opacity-100 transition-opacity">
                멤버십 안내
              </Link>
              <a href="#faq" className="block opacity-75 hover:opacity-100 transition-opacity">
                자주 묻는 질문
              </a>
              <Link href="/contact" className="block opacity-75 hover:opacity-100 transition-opacity">
                고객 지원
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold mb-4">연락처</h4>
            <div className="space-y-2 text-sm opacity-75">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>서울 강남구 테헤란로 123<br />한중빌딩 10층</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>+82-2-1234-5678</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>info@kscc.kr</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3 mt-4">
              <a href="#kakao" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <MessageSquare className="h-5 w-5" />
              </a>
              <a href="#wechat" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <MessageSquare className="h-5 w-5" />
              </a>
              <a href="#linkedin" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#youtube" className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-75">
            <div>
              © 2024 Korea Sichuan-Chongqing Chamber of Commerce. All rights reserved.
            </div>
            <div className="flex gap-6">
              <a href="#privacy" className="hover:opacity-100 transition-opacity">
                개인정보처리방침
              </a>
              <a href="#terms" className="hover:opacity-100 transition-opacity">
                이용약관
              </a>
              <a href="#sitemap" className="hover:opacity-100 transition-opacity">
                사이트맵
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
