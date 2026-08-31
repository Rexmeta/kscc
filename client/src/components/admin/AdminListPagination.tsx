import { Button } from '@/components/ui/button';

type AdminListPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  testId: string;
};

export function AdminListPagination({
  page,
  totalPages,
  onPageChange,
  testId,
}: AdminListPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3" data-testid={testId}>
      <Button
        variant="outline"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        data-testid={`${testId}-previous`}
      >
        이전
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        data-testid={`${testId}-next`}
      >
        다음
      </Button>
    </div>
  );
}