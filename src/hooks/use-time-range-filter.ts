import { useState, useCallback, useMemo } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from '@/config/dayjs.config';

export type TimeRange = [Dayjs, Dayjs] | null;

export interface DateRangeParams {
  dateDebut?: string;
  dateFin?: string;
}

/**
 * Hook de filtrage par intervalle de temps.
 *
 * Par défaut, charge les données du mois en cours (du 1er jour à la fin du mois).
 * Fournit :
 *  - `range` / `setRange` pour le sélecteur UI
 *  - `isInRange` pour filtrer côté client (secours)
 *  - `params` ({ dateDebut, dateFin } au format ISO) à envoyer au backend
 */
export function useTimeRangeFilter(): {
  range: TimeRange;
  setRange: (range: TimeRange) => void;
  isInRange: (date: string | Date | Dayjs | undefined) => boolean;
  params: DateRangeParams;
} {
  const [range, setRange] = useState<TimeRange>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const isInRange = useCallback(
    (date: string | Date | Dayjs | undefined) => {
      if (!range) return true;
      if (!date) return false;
      const d = dayjs(date).valueOf();
      return d >= range[0].valueOf() && d <= range[1].valueOf();
    },
    [range]
  );

  const params = useMemo<DateRangeParams>(() => {
    if (!range) return {};
    return {
      dateDebut: range[0].toISOString(),
      dateFin: range[1].toISOString(),
    };
  }, [range]);

  return { range, setRange, isInRange, params };
}
