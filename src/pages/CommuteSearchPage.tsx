import { useState } from 'react'

import HongKongMap from '@/components/HongKongMap'
import WorkDestinationInput from '@/components/WorkDestinationInput'
import type { Address } from '@/types/address'

export default function CommuteSearchPage() {
  const [workDestination, setWorkDestination] = useState<Address | null>(null)

  return (
    <main className="flex h-dvh flex-col bg-slate-50">
      <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-slate-900">
          Hong Kong Rent & Commute
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Find a home within your budget, with an easier, greener commute.
        </p>

        <div className="mt-4 max-w-xl">
          <WorkDestinationInput onSelect={setWorkDestination} />
        </div>

        {workDestination && (
          <div className="mt-3 text-sm text-slate-600" role="status">
            <p>Selected destination: {workDestination.address_zh}</p>
            <p className="mt-1 text-xs text-slate-500">
              Coordinates: {workDestination.latitude},{' '}
              {workDestination.longitude}
            </p>
          </div>
        )}
      </header>

      <section aria-label="香港地图" className="min-h-0 flex-1">
        <HongKongMap destination={workDestination} />
      </section>
    </main>
  )
}
