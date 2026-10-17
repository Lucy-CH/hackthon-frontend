import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  RecommendationRequest,
  RecommendationResponse,
} from '@/types/recommendation'

export async function getRecommendations(
  payload: RecommendationRequest,
): Promise<RecommendationResponse> {
  const response = await apiClient.post<ApiResponse<RecommendationResponse>>(
    '/api/recommendations',
    payload,
    {
      // Allow the existing route calculation plus the backend AI deadline (up to 60s).
      timeout: 180_000,
    },
  )

  return response.data.data
}
