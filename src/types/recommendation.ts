export interface RecommendationRequest {
  work_address_id: number
  max_monthly_rent_hkd: number
}

export interface RecommendationItem {
  rental_id: number
  title: string
  address: string
  district: string

  monthly_rent_hkd: string
  estimated_monthly_transport_hkd: string | null
  estimated_monthly_total_hkd: string | null

  estimated_one_way_co2e_kg: string | null
  estimated_monthly_co2e_kg: string | null
  emission_factor_version: string

  latitude: number
  longitude: number
  listing_url: string
  fetched_at: string

  commute: {
    duration_seconds: number
    distance_meters: number
    transfer_count: number
    walking_distance_meters: number | null
    fare: {
      currency: string
      amount: string
    } | null
    encoded_polyline: string | null
  }
}

export interface RecommendationResponse {
  work_address_id: number
  arrival_time: string
  candidate_count: number
  no_route_count: number
  items: RecommendationItem[]
}
