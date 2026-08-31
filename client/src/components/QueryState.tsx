import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  empty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
  loadingMessage?: string;
}

export function QueryState({
  isLoading,
  isError,
  onRetry,
  empty,
  emptyMessage,
  children,
  loadingMessage,
}: QueryStateProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center" role="status" aria-live="polite">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-4 text-muted-foreground">{loadingMessage || t('common.loading')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center" role="alert">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" aria-hidden="true" />
        <p className="mb-4 text-muted-foreground">{t('common.loadError')}</p>
        <Button variant="outline" onClick={onRetry} aria-label={t('common.retry')}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="py-12 text-center" role="status" aria-live="polite">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}