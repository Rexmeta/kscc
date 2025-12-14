import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Target, Lightbulb, Users, Handshake, Edit, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import PageEditModal from '@/components/PageEditModal';
import type { PostWithTranslations } from '@shared/schema';
import ksccLogoPath from '@assets/kscc_logo991_1765719750819.png';

interface AboutContent {
  hero: { title: string; intro: string };
  intro: { description: string };
  mission: { title: string; description: string; objectives: string[] };
  vision: { title: string; description: string; objectives: string[] };
  functions: { title: string; items: { title: string; items: string[] }[] };
  organization: { title: string; descriptions: string[] };
  future: { title: string; descriptions: string[] };
  pillars: { title: string; description: string }[];
}

export default function AboutPage() {
  const { isAdmin } = useAuth();
  const { language } = useLanguage();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: page, isLoading } = useQuery<PostWithTranslations>({
    queryKey: ['/api/posts/slug', 'about'],
    queryFn: async () => {
      const response = await fetch('/api/posts/slug/about');
      if (!response.ok) throw new Error('Page not found');
      return response.json();
    },
  });

  const getTranslation = () => {
    if (!page?.translations) return null;
    return page.translations.find(t => t.locale === language) || page.translations[0];
  };

  const translation = getTranslation();
  
  const parseContent = (): AboutContent | null => {
    if (!translation?.content) return null;
    try {
      return JSON.parse(translation.content);
    } catch {
      return null;
    }
  };

  const content = parseContent();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">페이지 콘텐츠를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {isAdmin && page && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="fixed bottom-6 right-6 z-50 shadow-lg"
            onClick={() => setIsEditModalOpen(true)}
            data-testid="button-edit-page"
          >
            <Edit className="h-4 w-4 mr-2" />
            페이지 편집
          </Button>
          <PageEditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            page={page}
          />
        </>
      )}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container">
          <div className="flex items-center gap-8">
            <img 
              src={ksccLogoPath} 
              alt="KSCC Logo" 
              className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0"
              data-testid="img-kscc-logo"
            />
            <div className="max-w-3xl flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                {content.hero.title}
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed">
                {content.hero.intro}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                {content.intro.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            {content.mission.title} & {content.vision.title}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Mission */}
            <Card className="p-8">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg mr-4">
                  <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold">{content.mission.title}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{content.mission.description}</p>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                {content.mission.objectives.map((objective, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Vision */}
            <Card className="p-8">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 dark:bg-red-900 p-3 rounded-lg mr-4">
                  <Lightbulb className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-2xl font-bold">{content.vision.title}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{content.vision.description}</p>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                {content.vision.objectives.map((objective, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Functions */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">{content.functions.title}</h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {content.functions.items.map((func, idx) => (
              <Card key={idx} className="p-6">
                <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
                  <h3 className="text-xl font-bold">{func.title}</h3>
                </div>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  {func.items.map((item, itemIdx) => (
                    <li key={itemIdx}>• {item}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Organization Structure */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">{content.organization.title}</h2>
          
          <div className="max-w-3xl mx-auto">
            <Card className="p-8">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg mr-4">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold">{content.organization.title}</h3>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                {content.organization.descriptions.map((desc, idx) => (
                  <p key={idx} className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                    {desc}
                  </p>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Future Vision */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white/10 p-4 rounded-full">
                <Handshake className="h-12 w-12" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-6">{content.future.title}</h2>
            {content.future.descriptions.map((desc, idx) => (
              <p key={idx} className={`${idx === 0 ? 'text-xl' : 'text-lg'} text-blue-100 leading-relaxed mb-6`}>
                {desc}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Three Pillars Images Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {content.pillars.map((pillar, idx) => (
              <Card key={idx} className="p-6 text-center">
                <div className={`${idx === 1 ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  {idx === 0 && <Building2 className="h-10 w-10 text-blue-600 dark:text-blue-400" />}
                  {idx === 1 && (
                    <svg className="h-10 w-10 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  )}
                  {idx === 2 && (
                    <svg className="h-10 w-10 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2">{pillar.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{pillar.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
