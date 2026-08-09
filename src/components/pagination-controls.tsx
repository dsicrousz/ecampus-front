import { Button, Input, Select, Space, Typography } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { UsePaginationReturn } from '@/hooks/use-pagination';

const { Text } = Typography;

interface PaginationControlsProps {
  pagination: UsePaginationReturn;
  /** Nombre total d'éléments (toutes pages confondues). */
  total: number;
  /** Nombre total de pages. */
  totalPages: number;
  /** Options de taille de page (défaut: [10, 20, 50]). */
  pageSizeOptions?: number[];
  /** Placeholder du champ de recherche. */
  searchPlaceholder?: string;
  /** Indique si une requête est en cours. */
  loading?: boolean;
}

/**
 * Barre de contrôles de pagination réutilisable.
 *
 * Comprend :
 *  - un champ de recherche avec debounce (géré par usePagination)
 *  - un sélecteur de taille de page
 *  - un indicateur "page X sur Y" + total
 *  - des boutons première / précédent / suivant / dernière
 */
export function PaginationControls({
  pagination,
  total,
  totalPages,
  pageSizeOptions = [10, 20, 50],
  searchPlaceholder = 'Rechercher...',
  loading = false,
}: PaginationControlsProps) {
  const { page, limit, search, setSearch, setPage, setLimit } = pagination;

  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Recherche */}
      <Input
        placeholder={searchPlaceholder}
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        allowClear
        style={{ width: 300 }}
        disabled={loading}
      />

      {/* Contrôles de pagination */}
      <Space size="middle" align="center" wrap>
        <Text type="secondary">
          {total} élément{total > 1 ? 's' : ''}
        </Text>

        <Select
          value={limit}
          onChange={(value) => setLimit(value)}
          disabled={loading}
          style={{ width: 110 }}
          options={pageSizeOptions.map((n) => ({ value: n, label: `${n} / page` }))}
        />

        <Space size="small">
          <Button
            icon={<DoubleLeftOutlined />}
            onClick={() => setPage(1)}
            disabled={!canPrev}
            size="small"
          />
          <Button
            icon={<LeftOutlined />}
            onClick={() => setPage(page - 1)}
            disabled={!canPrev}
            size="small"
          />
          <Text>
            Page <strong>{page}</strong> / {Math.max(1, totalPages)}
          </Text>
          <Button
            icon={<RightOutlined />}
            onClick={() => setPage(page + 1)}
            disabled={!canNext}
            size="small"
          />
          <Button
            icon={<DoubleRightOutlined />}
            onClick={() => setPage(totalPages)}
            disabled={!canNext}
            size="small"
          />
        </Space>
      </Space>
    </div>
  );
}
