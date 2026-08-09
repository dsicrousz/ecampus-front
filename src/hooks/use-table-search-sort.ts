import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortState<T extends string> {
  key: T | null;
  direction: SortDirection;
}

export interface ColumnDef<T extends string> {
  key: T;
  label: string;
  /** Renvoie la valeur brute utilisée pour le tri et la recherche. */
  accessor: (row: any) => string | number | Date | null | undefined;
  /** Indique si la colonne est triable (défaut: true). */
  sortable?: boolean;
  /** Indique si la colonne est incluse dans la recherche texte (défaut: true). */
  searchable?: boolean;
}

/**
 * Hook de recherche + tri pour les tableaux.
 *
 * - `search` : texte libre filtré sur toutes les colonnes `searchable`.
 * - `sort` : tri par colonne (clic sur l'en-tête bascule asc/desc).
 *
 * Usage :
 *   const columns: ColumnDef<'date'|'montant'>[] = [...]
 *   const { search, setSearch, sort, toggleSort, processed } = useTableSearchSort(rows, columns)
 */
export function useTableSearchSort<TCol extends string, TRow = any>(
  rows: TRow[] | undefined,
  columns: ColumnDef<TCol>[],
) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState<TCol>>({ key: null, direction: 'desc' });

  const searchableColumns = useMemo(
    () => columns.filter((c) => c.searchable !== false),
    [columns],
  );

  const toggleSort = useCallback((key: TCol) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: 'desc' };
    });
  }, []);

  const processed = useMemo(() => {
    let result = rows ?? [];

    // Recherche texte
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((row) =>
        searchableColumns.some((col) => {
          const val = col.accessor(row);
          if (val == null) return false;
          return String(val).toLowerCase().includes(q);
        }),
      );
    }

    // Tri
    if (sort.key) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        const dir = sort.direction === 'asc' ? 1 : -1;
        result = [...result].sort((a, b) => {
          const va = col.accessor(a);
          const vb = col.accessor(b);
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          if (va instanceof Date && vb instanceof Date) {
            return (va.getTime() - vb.getTime()) * dir;
          }
          if (typeof va === 'number' && typeof vb === 'number') {
            return (va - vb) * dir;
          }
          return String(va).localeCompare(String(vb), 'fr', { numeric: true }) * dir;
        });
      }
    }

    return result;
  }, [rows, search, sort, columns, searchableColumns]);

  return { search, setSearch, sort, toggleSort, processed };
}
