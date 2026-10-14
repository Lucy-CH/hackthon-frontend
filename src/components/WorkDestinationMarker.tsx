import { useEffect } from 'react'
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps'

import type { Address } from '@/types/address'

interface WorkDestinationMarkerProps {
  destination: Address | null
}

export default function WorkDestinationMarker({
  destination,
}: WorkDestinationMarkerProps) {
  const map = useMap()

  const latitude = destination?.latitude
  const longitude = destination?.longitude

  useEffect(() => {
    if (!map || latitude == null || longitude == null) {
      return
    }

    map.panTo({ lat: latitude, lng: longitude })
    map.setZoom(16)
  }, [map, latitude, longitude])

  if (!destination || latitude == null || longitude == null) {
    return null
  }

  return (
    <AdvancedMarker
      position={{ lat: latitude, lng: longitude }}
      title={destination.address_zh || destination.address_en}
    />
  )
}
