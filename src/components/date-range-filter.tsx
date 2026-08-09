import { DatePicker } from 'antd';
import dayjs from '@/config/dayjs.config';
import type { TimeRange } from '@/hooks/use-time-range-filter';

const { RangePicker } = DatePicker;

interface DateRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  maxWidth?: number;
}

/**
 * Sélecteur d'intervalle de dates réutilisable.
 * Limite la date de fin à aujourd'hui.
 */
export function DateRangeFilter({
  value,
  onChange,
  maxWidth = 400,
}: DateRangeFilterProps) {
  return (
    <RangePicker
      onChange={(dates: any) => onChange(dates as TimeRange)}
      value={value as any}
      placeholder={['Début', 'Fin']}
      maxDate={dayjs().endOf('day')}
      showTime
      style={{ width: '100%', maxWidth }}
    />
  );
}
