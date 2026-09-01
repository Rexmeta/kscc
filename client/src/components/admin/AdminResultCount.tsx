export function AdminResultCount({ total, testId }: { total?: number; testId?: string }) {
  if (total === undefined) return null;
  return (
    <p className="text-sm text-muted-foreground" aria-live="polite" data-testid={testId}>
      총 {total}건
    </p>
  );
}