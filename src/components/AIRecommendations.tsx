import { Sparkles } from 'lucide-react'

import type { RecommendationResponse } from '@/types/recommendation'

interface Props {
  result: RecommendationResponse
  requested: boolean
  selectedRentalId: number | null
  onSelect: (rentalId: number) => void
}

export default function AIRecommendations({
  result,
  requested,
  selectedRentalId,
  onSelect,
}: Props) {
  const ai = result.ai
  if (!requested || ai?.status === 'disabled' || ai?.status === 'no_candidates')
    return null

  const seen = new Set<number>()
  const picks =
    ai?.status === 'success'
      ? ai.recommendations
          .flatMap((pick) => {
            const home = result.items.find(
              (item) => item.rental_id === pick.rental_id,
            )
            if (!home || seen.has(pick.rental_id)) return []
            seen.add(pick.rental_id)
            return [{ ...pick, home }]
          })
          .slice(0, 2)
      : []

  return (
    <section
      aria-labelledby="ai-picks-heading"
      className="rounded-2xl border border-emerald-200 bg-white p-4"
    >
      <h2
        id="ai-picks-heading"
        className="flex items-center gap-2 font-semibold text-emerald-900"
      >
        <Sparkles className="size-4" aria-hidden="true" /> AI picks for you
      </h2>
      {picks.length > 0 ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {picks.length} {picks.length === 1 ? 'pick' : 'picks'} from{' '}
            {ai?.considered_count} homes considered, based on your preferences,
            rent and commute.
          </p>
          <div className="mt-3 space-y-3">
            {picks.map((pick, index) => (
              <button
                key={pick.rental_id}
                type="button"
                onClick={() => onSelect(pick.rental_id)}
                aria-pressed={selectedRentalId === pick.rental_id}
                className={`w-full rounded-xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${selectedRentalId === pick.rental_id ? 'border-emerald-700 bg-emerald-50' : 'border-slate-100 hover:border-emerald-300'}`}
              >
                <span className="text-xs font-semibold text-emerald-700">
                  AI pick {index + 1} · {pick.home.district}
                </span>
                <span className="mt-1 block font-semibold text-slate-900">
                  {pick.home.title}
                </span>
                <span className="mt-1 block text-xs text-slate-600">
                  HKD{' '}
                  {Number(pick.home.monthly_rent_hkd).toLocaleString('en-HK')} /
                  month · {Math.ceil(pick.home.commute.duration_seconds / 60)}{' '}
                  min commute
                </span>
                <span className="mt-3 block text-xs font-medium text-emerald-700">
                  {selectedRentalId === pick.rental_id
                    ? 'Selected · route shown on map'
                    : 'View this home’s route'}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Open a home's details for the full AI assessment and comparison.
          </p>
        </>
      ) : (
        <p
          role="status"
          className="mt-2 text-sm leading-relaxed text-slate-600"
        >
          AI picks are currently unavailable. You can still compare all homes
          and routes below.
        </p>
      )}
    </section>
  )
}
