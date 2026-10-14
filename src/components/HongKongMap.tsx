import {
  APIProvider,
  APILoadingStatus,
  Map,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps'

import WorkDestinationMarker from '@/components/WorkDestinationMarker'
import type { Address } from '@/types/address'

interface HongKongMapProps {
  destination: Address | null
}

function MapContent({ destination }: HongKongMapProps) {
  const status = useApiLoadingStatus()

  if (
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <div role="alert" className="flex h-full items-center justify-center p-6">
        Unable to load the map. Please check your connection and map
        configuration.
      </div>
    )
  }

  if (status !== APILoadingStatus.LOADED) {
    return (
      <div role="status" className="flex h-full items-center justify-center">
        Loading map...
      </div>
    )
  }

  return (
    <Map
      mapId="DEMO_MAP_ID"
      defaultCenter={{ lat: 22.3193, lng: 114.1694 }}
      defaultZoom={12}
      gestureHandling="greedy"
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl
      zoomControl
      style={{ width: '100%', height: '100%' }}
    >
      <WorkDestinationMarker destination={destination} />
    </Map>
  )
}

export default function HongKongMap({ destination }: HongKongMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()

  if (!apiKey) {
    return (
      <div role="alert" className="flex h-full items-center justify-center p-6">
        The map API key is missing.
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey} language="zh-TW" region="HK">
      <MapContent destination={destination} />
    </APIProvider>
  )
}
