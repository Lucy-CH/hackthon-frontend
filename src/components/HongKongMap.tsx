import {
  APIProvider,
  APILoadingStatus,
  Map,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps'

function MapContent() {
  const status = useApiLoadingStatus()

  if (
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <div role="alert" className="flex h-full items-center justify-center p-6">
        地图加载失败，请检查网络、API 密钥及 Google Cloud 配置。
      </div>
    )
  }

  if (status !== APILoadingStatus.LOADED) {
    return (
      <div role="status" className="flex h-full items-center justify-center">
        正在加载香港地图…
      </div>
    )
  }

  return (
    <Map
      defaultCenter={{ lat: 22.3193, lng: 114.1694 }}
      defaultZoom={12}
      gestureHandling="greedy"
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl
      zoomControl
      style={{ width: '100%', height: '100%' }}
    />
  )
}

export default function HongKongMap() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()

  if (!apiKey) {
    return (
      <div role="alert" className="flex h-full items-center justify-center p-6">
        请在 .env.local 中配置地图密钥，然后重启开发服务。
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey} language="zh-TW" region="HK">
      <MapContent />
    </APIProvider>
  )
}