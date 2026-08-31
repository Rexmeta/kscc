import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

interface PagePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  testIdPrefix?: string;
}

export function getPageNumbers(page: number, totalPages: number, visibleCount = 5): number[] {
  if (totalPages <= 0) return [];
  const count = Math.min(visibleCount, totalPages);
  const start = Math.max(1, Math.min(page - Math.floor(count / 2), totalPages - count + 1));
  return Array.from({ length: count }, (_, index) => start + index);
}

export function PagePagination({
  page,
  totalPages,
  onPageChange,
  testIdPrefix = 'button-page',
}: PagePaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <nav className="mt-12 flex items-center justify-center gap-2" aria-label={t('common.pagination')}>
      <Button
        variant="outline"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label={t('common.previous')}
        data-testid={`${testIdPrefix}-prev`}
      >
        {t('common.previous')}
      </Button>
      <div className="flex gap-2" role="list">
        {pageNumbers.map((pageNumber) => (
          <Button
            key={pageNumber}
            variant={page === pageNumber ? 'default' : 'outline'}
            onClick={() => onPageChange(pageNumber)}
            aria-current={page === pageNumber ? 'page' : undefined}
            aria-label={`${t('common.page')} ${pageNumber}`}
            data-testid={`${testIdPrefix}-${pageNumber}`}
          >
            {pageNumber}
          </Button>
        ))}
      </div>
      <Button
        variant="outline"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label={t('common.next')}
        data-testid={`${testIdPrefix}-next`}
      >
        {t('common.next')}
      </Button>
      <span className="sr-only" aria-live="polite">
        {t('common.page')} {page} {t('common.of')} {totalPages}
      </span>
    </nav>
  );
}