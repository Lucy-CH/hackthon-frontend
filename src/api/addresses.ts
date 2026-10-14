import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type { Address, AddressSearchResponse } from '@/types/address'

export async function searchAddresses(
  keyword: string,
  signal?: AbortSignal,
): Promise<Address[]> {
  const query = keyword.trim()

  if (!query) {
    return []
  }

  const response = await apiClient.get<
    ApiResponse<AddressSearchResponse>
  >('/api/code-tables/address_list', {
    params: {
      q: query,
      limit: 10,
    },
    signal,
  })

  return response.data.data.items
}