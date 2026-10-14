import HongKongMap from './components/HongKongMap'

export default function App() {
  return (
    <main className="flex h-dvh flex-col bg-slate-50">
      <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-slate-900">
          香港租房通勤助手
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          探索香港，寻找适合你的居住地点
        </p>
      </header>

      <section aria-label="香港地图" className="min-h-0 flex-1">
        <HongKongMap />
      </section>
    </main>
  )
}