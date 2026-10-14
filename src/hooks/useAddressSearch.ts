import { useQuery } from '@tanstack/react-query'

import { searchAddresses } from '@/api/addresses'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export function useAddressSearch(keyword: string, enabled = true) {
  const keywordTrimmed = keyword.trim()
  const debouncedKeyword = useDebouncedValue(keywordTrimmed)

  const isDebouncing = keywordTrimmed !== debouncedKeyword
  const canSearch = enabled && keywordTrimmed.length > 0
  const isReady = canSearch && !isDebouncing

  const query = useQuery({
    queryKey: ['addresses', debouncedKeyword],
    queryFn: ({ signal }) => searchAddresses(debouncedKeyword, signal),
    enabled: isReady,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  })

  return {
    items: isReady ? (query.data ?? []) : [],
    isLoading: canSearch && (isDebouncing || query.isFetching),
    error: isReady ? query.error : null,
  }
}
