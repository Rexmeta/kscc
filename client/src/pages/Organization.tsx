import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OrganizationMember } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Award, Building, Briefcase, GraduationCap, UserCheck } from 'lucide-react';

const CATEGORY_CONFIG = [
  { 
    value: 'executives', 
    labels: { ko: '임원진', en: 'Executives', zh: '管理层' },
    icon: Award,
    color: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
  },
  { 
    value: 'honorary', 
    labels: { ko: '명예직', en: 'Honorary', zh: '荣誉职位' },
    icon: GraduationCap,
    color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800'
  },
  { 
    value: 'vicepresidents', 
    labels: { ko: '부회장', en: 'Vice Presidents', zh: '副会长' },
    icon: Users,
    color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
  },
  { 
    value: 'directors', 
    labels: { ko: '이사', en: 'Directors', zh: '理事' },
    icon: Briefcase,
    color: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800'
  },
  { 
    value: 'advisors', 
    labels: { ko: '고문', en: 'Advisors', zh: '顾问' },
    icon: UserCheck,
    color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'
  },
  { 
    value: 'secretariat', 
    labels: { ko: '사무국', en: 'Secretariat', zh: '秘书处' },
    icon: Building,
    color: 'bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800'
  },
  { 
    value: 'committees', 
    labels: { ko: '위원회', en: 'Committees', zh: '委员会' },
    icon: Users,
    color: 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800'
  },
  { 
    value: 'organizations', 
    labels: { ko: '단체회원', en: 'Organization Members', zh: '团体会员' },
    icon: Building,
    color: 'bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800'
  },
];

const PAGE_LABELS = {
  title: { ko: '조직 구조', en: 'Organization Structure', zh: '组织架构' },
  subtitle: { ko: '한국 사천-충칭 총상회의 조직 구성원을 소개합니다.', en: 'Meet the members of Korea Sichuan-Chongqing Chamber of Commerce.', zh: '介绍韩国四川-重庆总商会的组织成员。' },
  noMembers: { ko: '등록된 조직 구성원이 없습니다.', en: 'No organization members registered.', zh: '暂无组织成员。' },
};

function getMemberName(member: OrganizationMember, language: string): string {
  if (language === 'en' && member.nameEn) return member.nameEn;
  if (language === 'zh' && member.nameZh) return member.nameZh;
  return member.name;
}

function getMemberPosition(member: OrganizationMember, language: string): string {
  if (language === 'en' && member.positionEn) return member.positionEn;
  if (language === 'zh' && member.positionZh) return member.positionZh;
  return member.position;
}

function getMemberDescription(member: OrganizationMember, language: string): string | null {
  if (language === 'en' && member.descriptionEn) return member.descriptionEn;
  if (language === 'zh' && member.descriptionZh) return member.descriptionZh;
  return member.description;
}

function getLabel(labels: { ko: string; en: string; zh: string }, language: string): string {
  return labels[language as keyof typeof labels] || labels.ko;
}

function MemberCard({ member, language }: { member: OrganizationMember; language: string }) {
  const name = getMemberName(member, language);
  const position = getMemberPosition(member, language);
  const description = getMemberDescription(member, language);

  return (
    <div className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700" data-testid={`card-org-member-${member.id}`}>
      {member.photo ? (
        <img 
          src={member.photo} 
          alt={name}
          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
          <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 dark:text-white truncate">{name}</h4>
        <p className="text-sm text-primary font-medium">{position}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
}

function CategorySection({ 
  category, 
  members, 
  language 
}: { 
  category: typeof CATEGORY_CONFIG[0]; 
  members: OrganizationMember[];
  language: string;
}) {
  const Icon = category.icon;
  const categoryLabel = getLabel(category.labels, language);

  if (members.length === 0) return null;

  return (
    <section className={`mb-8 p-6 rounded-xl border ${category.color}`} data-testid={`section-org-${category.value}`}>
      <div className="flex items-center space-x-3 mb-6">
        <Icon className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{categoryLabel}</h2>
        <span className="text-sm text-muted-foreground">({members.length})</span>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} language={language} />
        ))}
      </div>
    </section>
  );
}

export default function Organization() {
  const { language } = useLanguage();

  const { data: members, isLoading } = useQuery<OrganizationMember[]>({
    queryKey: ['/api/organization-members'],
    queryFn: async () => {
      const response = await fetch('/api/organization-members?isActive=true');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  const groupedMembers = CATEGORY_CONFIG.reduce((acc, cat) => {
    acc[cat.value] = (members || [])
      .filter(m => m.category === cat.value)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return acc;
  }, {} as Record<string, OrganizationMember[]>);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container text-center">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-org-title">
            {getLabel(PAGE_LABELS.title, language)}
          </h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto" data-testid="text-org-subtitle">
            {getLabel(PAGE_LABELS.subtitle, language)}
          </p>
        </div>
      </div>

      <div className="container py-12">
        {isLoading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-xl border bg-white dark:bg-gray-800">
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center space-x-4 p-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {CATEGORY_CONFIG.map((cat) => (
              <CategorySection
                key={cat.value}
                category={cat}
                members={groupedMembers[cat.value] || []}
                language={language}
              />
            ))}
            {(!members || members.length === 0) && (
              <div className="text-center py-16 text-muted-foreground">
                {getLabel(PAGE_LABELS.noMembers, language)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
