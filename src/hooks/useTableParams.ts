import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface TableQueryParams {
  page: number
  size: number
  sort?: string
}

export interface UseTableParamsOptions {
  defaultPage?: number
  defaultSize?: number
  defaultSort?: string
}

export function useTableParams(options: UseTableParamsOptions = {}) {
  const { defaultPage = 0, defaultSize = 20, defaultSort } = options
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo<TableQueryParams>(() => {
    const rawPage = Number(searchParams.get('page'))
    const rawSize = Number(searchParams.get('size'))
    const rawSort = searchParams.get('sort') ?? defaultSort

    return {
      page: Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : defaultPage,
      size: Number.isInteger(rawSize) && rawSize > 0 ? rawSize : defaultSize,
      sort: rawSort || undefined,
    }
  }, [searchParams, defaultPage, defaultSize, defaultSort])

  const setTableParams = useCallback(
    (next: Partial<TableQueryParams>) => {
      setSearchParams(
        (prev) => {
          const updated = new URLSearchParams(prev)
          if (next.page !== undefined) {
            updated.set('page', String(Math.max(0, next.page)))
          }
          if (next.size !== undefined) {
            updated.set('size', String(Math.max(1, next.size)))
          }
          if ('sort' in next) {
            if (next.sort) {
              updated.set('sort', next.sort)
            } else {
              updated.delete('sort')
            }
          }
          return updated
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { params, setTableParams }
}
