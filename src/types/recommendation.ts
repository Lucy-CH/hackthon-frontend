export interface RecommendationRequest {
  work_address_id: number
  max_monthly_rent_hkd: number
}

export interface CommuteStep {
  travel_mode: string
  instruction: string

  distance_meters: number | null
  duration_seconds: number | null

  vehicle_type: string | null
  line_name: string | null
  line_short_name: string | null
  headsign: string | null

  departure_stop: string | null
  arrival_stop: string | null

  departure_time: string | null
  arrival_time: string | null

  stop_count: number | null
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
    steps: CommuteStep[]
  }
}

export interface RecommendationResponse {
  work_address_id: number
  arrival_time: string
  candidate_count: number
  no_route_count: number
  items: RecommendationItem[]
}
