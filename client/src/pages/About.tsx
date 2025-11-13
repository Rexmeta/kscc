import { Building2, Target, Lightbulb, Users, Handshake } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { t } from '@/lib/i18n';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t('about.hero.title')}
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              {t('about.hero.intro')}
            </p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                {t('about.intro.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">{t('about.mission.title')} {t('about.vision.title')}</h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Mission */}
            <Card className="p-8">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg mr-4">
                  <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold">{t('about.mission.title')}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{t('about.mission.description')}</p>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>{t('about.mission.objective1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>{t('about.mission.objective2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>{t('about.mission.objective3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>{t('about.mission.objective4')}</span>
                </li>
              </ul>
            </Card>

            {/* Vision */}
            <Card className="p-8">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 dark:bg-red-900 p-3 rounded-lg mr-4">
                  <Lightbulb className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-2xl font-bold">{t('about.vision.title')}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{t('about.vision.description')}</p>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">•</span>
                  <span>{t('about.vision.objective1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">•</span>
                  <span>{t('about.vision.objective2')}</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Functions */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">{t('about.functions.title')}</h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Function 1 */}
            <Card className="p-6">
              <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
                <h3 className="text-xl font-bold">{t('about.functions.trade.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• {t('about.functions.trade.item1')}</li>
                <li>• {t('about.functions.trade.item2')}</li>
                <li>• {t('about.functions.trade.item3')}</li>
              </ul>
            </Card>

            {/* Function 2 */}
            <Card className="p-6">
              <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
                <h3 className="text-xl font-bold">{t('about.functions.industry.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• {t('about.functions.industry.item1')}</li>
                <li>• {t('about.functions.industry.item2')}</li>
                <li>• {t('about.functions.industry.item3')}</li>
              </ul>
            </Card>

            {/* Function 3 */}
            <Card className="p-6">
              <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
                <h3 className="text-xl font-bold">{t('about.functions.innovation.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• {t('about.functions.innovation.item1')}</li>
                <li>• {t('about.functions.innovation.item2')}</li>
                <li>• {t('about.functions.innovation.item3')}</li>
              </ul>
            </Card>

            {/* Function 4 */}
            <Card className="p-6">
              <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
                <h3 className="text-xl font-bold">{t('about.functions.culture.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• {t('about.functions.culture.item1')}</li>
                <li>• {t('about.functions.culture.item2')}</li>
                <li>• {t('about.functions.culture.item3')}</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Organization Structure */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">{t('about.organization.title')}</h2>
          
          <div className="max-w-3xl mx-auto">
            <Card className="p-8">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg mr-4">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold">{t('about.organization.title')}</h3>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  {t('about.organization.description1')}
                </p>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  {t('about.organization.description2')}
                </p>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t('about.organization.description3')}
                </p>
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
            <h2 className="text-3xl font-bold mb-6">{t('about.future.title')}</h2>
            <p className="text-xl text-blue-100 leading-relaxed mb-6">
              {t('about.future.description1')}
            </p>
            <p className="text-lg text-blue-100 leading-relaxed">
              {t('about.future.description2')}
            </p>
          </div>
        </div>
      </section>

      {/* Three Pillars Images Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="p-6 text-center">
              <div className="bg-blue-100 dark:bg-blue-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('about.pillars.business.title')}</h3>
              <p className="text-gray-600 dark:text-gray-300">{t('about.pillars.business.description')}</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="bg-red-100 dark:bg-red-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-10 w-10 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">{t('about.pillars.culture.title')}</h3>
              <p className="text-gray-600 dark:text-gray-300">{t('about.pillars.culture.description')}</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="bg-blue-100 dark:bg-blue-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-10 w-10 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">{t('about.pillars.legal.title')}</h3>
              <p className="text-gray-600 dark:text-gray-300">{t('about.pillars.legal.description')}</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
