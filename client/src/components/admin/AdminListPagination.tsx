import { Button } from '@/components/ui/button';

type AdminListPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  testId: string;
  total?: number;
};

export function AdminListPagination({
  page,
  totalPages,
  onPageChange,
  testId,
  total,
}: AdminListPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3" data-testid={testId}>
      {total !== undefined && <span className="text-sm text-muted-foreground">총 {total}건</span>}
      <div className="flex items-center justify-center gap-3">
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
    </div>
  );
}