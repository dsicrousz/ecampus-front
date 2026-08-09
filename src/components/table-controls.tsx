import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react';
import type { SortState, SortDirection } from '@/hooks/use-table-search-sort';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SortableHeaderProps<TCol extends string> {
  label: string;
  columnKey: TCol;
  sort: SortState<TCol>;
  onToggleSort: (key: TCol) => void;
  className?: string;
}

export function SortableHeader<TCol extends string>({
  label,
  columnKey,
  sort,
  onToggleSort,
  className,
}: SortableHeaderProps<TCol>) {
  const isActive = sort.key === columnKey;
  return (
    <button
      type="button"
      onClick={() => onToggleSort(columnKey)}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground',
        isActive && 'text-foreground',
        className,
      )}
    >
      {label}
      {isActive ? (
        sort.direction === 'asc' ? (
          <ArrowUp className="size-3.5" />
        ) : (
          <ArrowDown className="size-3.5" />
        )
      ) : (
        <ChevronsUpDown className="size-3.5 opacity-40" />
      )}
    </button>
  );
}

interface TableToolbarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TableToolbar({ value, onChange, placeholder, className }: TableToolbarProps) {
  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder ?? 'Rechercher...'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}

/** Indicateur de direction de tri pour usage externe. */
export function sortIndicator(direction: SortDirection): string {
  return direction === 'asc' ? '↑' : '↓';
}
