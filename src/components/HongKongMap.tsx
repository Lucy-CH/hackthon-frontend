import { useEffect } from 'react'
import {
  AdvancedMarker,
  APIProvider,
  APILoadingStatus,
  Map,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'

import type { Address } from '@/types/address'
import type { RecommendationItem } from '@/types/recommendation'

interface HongKongMapProps {
  destination: Address | null
  recommendation: RecommendationItem | null
}

function CommuteRoute({ destination, recommendation }: HongKongMapProps) {
  const map = useMap()
  const geometry = useMapsLibrary('geometry')

  const workLatitude = destination?.latitude
  const workLongitude = destination?.longitude
  const homeLatitude = recommendation?.latitude
  const homeLongitude = recommendation?.longitude
  const encodedPolyline = recommendation?.commute.encoded_polyline

  useEffect(() => {
    if (!map || !geometry) {
      return
    }

    const bounds = new google.maps.LatLngBounds()

    if (workLatitude != null && workLongitude != null) {
      bounds.extend({
        lat: workLatitude,
        lng: workLongitude,
      })
    }

    if (homeLatitude != null && homeLongitude != null) {
      bounds.extend({
        lat: homeLatitude,
        lng: homeLongitude,
      })
    }

    let route: google.maps.Polyline | null = null

    if (encodedPolyline) {
      const path = geometry.encoding.decodePath(encodedPolyline)

      for (const point of path) {
        bounds.extend(point)
      }

      route = new google.maps.Polyline({
        map,
        path,
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        clickable: false,
      })
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 64)
    }

    return () => {
      route?.setMap(null)
    }
  }, [
    map,
    geometry,
    workLatitude,
    workLongitude,
    homeLatitude,
    homeLongitude,
    encodedPolyline,
  ])

  return (
    <>
      {workLatitude != null && workLongitude != null && (
        <AdvancedMarker
          position={{ lat: workLatitude, lng: workLongitude }}
          title={
            destination?.address_en ||
            destination?.address_zh ||
            'Work destination'
          }
        >
          <div className="rounded-full border-2 border-white bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-md">
            Work
          </div>
        </AdvancedMarker>
      )}

      {homeLatitude != null && homeLongitude != null && (
        <AdvancedMarker
          position={{ lat: homeLatitude, lng: homeLongitude }}
          title={recommendation?.address || 'Selected home'}
        >
          <div className="rounded-full border-2 border-white bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-md">
            Home
          </div>
        </AdvancedMarker>
      )}
    </>
  )
}

function MapContent(props: HongKongMapProps) {
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
    <div className="relative h-full min-h-[400px]">
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={{ lat: 22.3193, lng: 114.1694 }}
        defaultZoom={12}
        restriction={{
          latLngBounds: {
            north: 22.57,
            south: 22.15,
            west: 113.83,
            east: 114.45,
          },
          strictBounds: true,
        }}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        zoomControl
        style={{ width: '100%', height: '100%', minHeight: 400 }}
      >
        <CommuteRoute {...props} />
      </Map>

      {props.recommendation &&
        !props.recommendation.commute.encoded_polyline && (
          <div
            role="status"
            className="absolute left-4 top-4 max-w-xs rounded-lg bg-white p-3 text-sm text-slate-600 shadow-md"
          >
            Route geometry is unavailable. Showing home and work locations.
          </div>
        )}
    </div>
  )
}

export default function HongKongMap(props: HongKongMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()

  if (!apiKey) {
    return (
      <div role="alert" className="flex h-full items-center justify-center p-6">
        The map API key is missing.
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey} language="en" region="HK">
      <MapContent {...props} />
    </APIProvider>
  )
}
