import type { FormEvent } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type AdminFilterOption = { value: string; label: string };
export type AdminFilterSelect = {
  name: string;
  label: string;
  value: string;
  options: AdminFilterOption[];
  onChange: (value: string) => void;
  testId: string;
};

export function AdminFilterBar({
  scope,
  search,
  onSearchChange,
  onApply,
  onReset,
  searchLabel = '검색',
  searchPlaceholder = '검색어를 입력하세요',
  searchTestId,
  filters = [],
  total,
}: {
  scope: string;
  search: string;
  onSearchChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  searchTestId?: string;
  filters?: AdminFilterSelect[];
  total?: number;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply();
  };

  return (
    <>
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:gap-3 sm:p-4 md:flex-row md:items-end md:flex-wrap" data-testid={`admin-filters-${scope}`}>
      <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[220px] sm:space-y-2">
        <label htmlFor={`${scope}-search`} className="text-xs font-medium sm:text-sm">{searchLabel}</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id={`${scope}-search`}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-9 text-sm sm:h-10"
            data-testid={searchTestId || `input-search-${scope}`}
          />
        </div>
      </div>
      {filters.map((filter) => (
        <div key={filter.name} className="w-full space-y-1.5 sm:space-y-2 md:w-40">
          <label htmlFor={filter.testId} className="text-xs font-medium sm:text-sm">{filter.label}</label>
          <Select value={filter.value} onValueChange={filter.onChange}>
            <SelectTrigger id={filter.testId} className="h-9 text-sm sm:h-10" data-testid={filter.testId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      <div className="flex w-full gap-2 md:w-auto">
        <Button className="h-9 flex-1 px-3 text-sm md:flex-none" type="submit" data-testid={`button-filter-${scope}`}>
          <Search className="mr-2 h-4 w-4" />검색
        </Button>
        <Button className="h-9 flex-1 px-3 text-sm md:flex-none" type="button" variant="outline" onClick={onReset} data-testid={`button-reset-${scope}`}>
          초기화
        </Button>
      </div>
    </form>
    {total !== undefined && <p className="text-sm text-muted-foreground" aria-live="polite">총 {total}건</p>}
    </>
  );
}