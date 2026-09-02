import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OrganizationMember } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { t } from '@/lib/i18n';
import {
  ORGANIZATION_CATEGORY_DISPLAY,
  getCategoryLabel,
  getMemberDescription,
  getMemberName,
  getMemberPosition,
} from '@/lib/organizationDisplay';
import { compareOrganizationMembers } from '@shared/organization';
import { fetchJson } from '@/lib/queryClient';
import { QueryState } from '@/components/QueryState';

const CATEGORY_CONFIG = ORGANIZATION_CATEGORY_DISPLAY;

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
          width={64}
          height={64}
          loading="lazy"
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
  category: (typeof CATEGORY_CONFIG)[number];
  members: OrganizationMember[];
  language: string;
}) {
  const Icon = category.icon;
  const categoryLabel = getCategoryLabel(category, language);

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
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery<{
    members: OrganizationMember[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ['/api/organization-members', { page, limit: 50 }],
    queryFn: async ({ signal }) => {
      return fetchJson(`/api/organization-members?isActive=true&page=${page}&limit=50`, { signal });
    },
  });
  const members = data?.members;
  const totalPages = data?.totalPages || 0;

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const groupedMembers = CATEGORY_CONFIG.reduce((acc, cat) => {
    acc[cat.value] = (members || [])
      .filter(m => m.category === cat.value)
       .sort(compareOrganizationMembers);
    return acc;
  }, {} as Record<string, OrganizationMember[]>);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
       <div className="bg-primary py-6 text-primary-foreground sm:py-16">
        <div className="container text-center">
           <h1 className="mb-2 text-2xl font-bold sm:mb-4 sm:text-4xl" data-testid="text-org-title">
            {t('org.title')}
          </h1>
           <p className="mx-auto max-w-2xl text-sm opacity-90 sm:text-lg" data-testid="text-org-subtitle">
            {t('org.subtitle')}
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
        ) : isError ? (
          <QueryState
            isLoading={false}
            isError
            onRetry={() => refetch()}
            empty={false}
            emptyMessage=""
          >
            <div />
          </QueryState>
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
                {t('org.noMembers')}
              </div>
            )}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  data-testid="button-org-prev-page"
                >
                  {t('common.previous')}
                </Button>
                <span className="text-sm text-muted-foreground" aria-live="polite">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  data-testid="button-org-next-page"
                >
                  {t('common.next')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
