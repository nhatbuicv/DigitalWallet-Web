import { Table, type TablePaginationConfig, type TableProps } from 'antd'
import type { SorterResult } from 'antd/es/table/interface'
import type { PageResponse } from '@/api/types'
import { useTableParams, type TableQueryParams } from '@/hooks/useTableParams'

export interface DataTableProps<T extends object> extends Omit<
  TableProps<T>,
  'dataSource' | 'onChange'
> {
  data?: PageResponse<T>
  dataSource?: T[]
  defaultPageSize?: number
  syncUrl?: boolean
  onQueryChange?: (params: TableQueryParams) => void
  onTableChange?: TableProps<T>['onChange']
}

function extractSort<T>(sorter: SorterResult<T> | SorterResult<T>[]): string | undefined {
  const active = Array.isArray(sorter) ? sorter.find((s) => Boolean(s.order)) : sorter
  if (!active || !active.order) {
    return undefined
  }
  const field = active.field ?? active.columnKey
  if (!field) {
    return undefined
  }
  const fieldName = Array.isArray(field) ? field.join('.') : String(field)
  const direction = active.order === 'ascend' ? 'asc' : 'desc'
  return `${fieldName},${direction}`
}

export function DataTable<T extends object>({
  data,
  dataSource,
  defaultPageSize = 20,
  syncUrl = true,
  onQueryChange,
  onTableChange,
  pagination,
  rowKey = 'uid',
  scroll = { x: 'max-content' },
  size = 'middle',
  ...rest
}: DataTableProps<T>) {
  const { params, setTableParams } = useTableParams({ defaultSize: defaultPageSize })

  const resolvedDataSource = dataSource ?? data?.data ?? []
  const currentZeroBased = data?.currentPage ?? params.page
  const pageSize = data?.pageSize ?? params.size
  const total = data?.totalElements ?? resolvedDataSource.length

  const mergedPagination: false | TablePaginationConfig =
    pagination === false
      ? false
      : {
          current: currentZeroBased + 1,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (t, range) => `${range[0]}-${range[1]} / ${t} bản ghi`,
          ...pagination,
        }

  const handleChange: TableProps<T>['onChange'] = (nextPagination, filters, sorter, extra) => {
    const nextSize = nextPagination.pageSize ?? pageSize
    const sizeChanged = nextSize !== pageSize
    const nextPage = sizeChanged ? 0 : Math.max(0, (nextPagination.current ?? 1) - 1)
    const nextSort = extractSort(sorter)

    const nextQuery: TableQueryParams = {
      page: nextPage,
      size: nextSize,
      sort: nextSort,
    }

    if (syncUrl) {
      setTableParams(nextQuery)
    }
    onQueryChange?.(nextQuery)
    onTableChange?.(nextPagination, filters, sorter, extra)
  }

  return (
    <Table<T>
      rowKey={rowKey}
      size={size}
      scroll={scroll}
      dataSource={resolvedDataSource}
      pagination={mergedPagination}
      onChange={handleChange}
      {...rest}
    />
  )
}
