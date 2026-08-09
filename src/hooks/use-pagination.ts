import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from 'react-use';
import type { PaginationParams } from '@/types/pagination';

export type SortOrder = 'asc' | 'desc';

export interface UsePaginationOptions {
  /** Page initiale (défaut: 1). */
  initialPage?: number;
  /** Nombre d'éléments par page (défaut: 10). */
  initialLimit?: number;
  /** Délai de debounce pour la recherche en ms (défaut: 300). */
  debounceMs?: number;
  /** Tri initial. */
  initialSortBy?: string;
  initialSortOrder?: SortOrder;
  /** Filtre par type (pour /service). */
  initialType?: string;
  /** Filtre par état actif/inactif. */
  initialActive?: boolean;
}

export interface UsePaginationReturn {
  page: number;
  limit: number;
  search: string;
  debouncedSearch: string;
  sortBy: string | undefined;
  sortOrder: SortOrder;
  type: string | undefined;
  active: boolean | undefined;
  params: PaginationParams;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (sortBy: string, sortOrder?: SortOrder) => void;
  toggleSort: (sortBy: string) => void;
  setType: (type: string | undefined) => void;
  setActive: (active: boolean | undefined) => void;
  resetPage: () => void;
}

/**
 * Hook générique de pagination.
 *
 * Gère :
 *  - `page` / `limit` courantes
 *  - `search` avec debounce (`debouncedSearch`)
 *  - `sortBy` / `sortOrder`
 *  - la construction des `params` à envoyer au backend
 *
 * La recherche et le changement de limit reset automatiquement à la page 1.
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    initialLimit = 10,
    debounceMs = 300,
    initialSortBy,
    initialSortOrder = 'asc',
    initialType,
    initialActive,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | undefined>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [type, setTypeState] = useState<string | undefined>(initialType);
  const [active, setActiveState] = useState<boolean | undefined>(initialActive);

  useDebounce(() => setDebouncedSearch(search), debounceMs, [search]);

  // Reset à la page 1 quand la recherche, le limit, le type ou active change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, limit, type, active]);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
  }, []);

  const setType = useCallback((newType: string | undefined) => {
    setTypeState(newType);
  }, []);

  const setActive = useCallback((newActive: boolean | undefined) => {
    setActiveState(newActive);
  }, []);

  const setSort = useCallback((newSortBy: string, newSortOrder?: SortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder ?? 'asc');
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: string) => {
    setSortBy((prevKey) => {
      if (prevKey !== key) {
        setSortOrder('asc');
        setPage(1);
        return key;
      }
      setSortOrder((prevOrder) => {
        const next: SortOrder = prevOrder === 'asc' ? 'desc' : 'asc';
        setPage(1);
        return next;
      });
      return prevKey;
    });
  }, []);

  const resetPage = useCallback(() => setPage(1), []);

  const params = useMemo<PaginationParams>(() => {
    const p: PaginationParams = {
      page,
      limit,
    };
    if (debouncedSearch.trim()) p.search = debouncedSearch.trim();
    if (sortBy) {
      p.sortBy = sortBy;
      p.sortOrder = sortOrder;
    }
    if (type) p.type = type;
    if (active != null) p.active = active;
    return p;
  }, [page, limit, debouncedSearch, sortBy, sortOrder, type, active]);

  return {
    page,
    limit,
    search,
    debouncedSearch,
    sortBy,
    sortOrder,
    type,
    active,
    params,
    setPage,
    setLimit,
    setSearch,
    setSort,
    toggleSort,
    setType,
    setActive,
    resetPage,
  };
}
