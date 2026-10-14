export interface Address {
  id: number
  geo_address: string | null

  building_name_zh: string | null
  building_name_en: string | null

  address_zh: string
  address_en: string

  district_zh: string | null
  district_en: string | null

  latitude: number | null
  longitude: number | null
}

export interface AddressSearchResponse {
  items: Address[]
}
