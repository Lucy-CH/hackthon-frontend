import type { Address } from '@/types/address'
import type { RecommendationItem } from '@/types/recommendation'

interface CommuteRouteDetailsProps {
  recommendation: RecommendationItem
  destination: Address | null
}

export default function CommuteRouteDetails({
  recommendation,
  destination,
}: CommuteRouteDetailsProps) {
  const { commute } = recommendation
  const minutes = Math.ceil(commute.duration_seconds / 60)
  const transfers = commute.transfer_count

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Your commute
      </p>

      <h2 className="mt-2 text-lg font-semibold text-slate-900">
        From home to work
      </h2>

      <p className="mt-1 text-sm text-slate-500">{recommendation.address}</p>

      <p className="mt-2 text-sm font-medium text-slate-700">
        About {minutes} min ·{' '}
        {transfers === 0
          ? 'No transfers'
          : `${transfers} transfer${transfers === 1 ? '' : 's'}`}
      </p>

      {commute.steps.length > 0 ? (
        <ol className="mt-6">
          {commute.steps.map((step, index) => {
            const isWalking = step.travel_mode === 'WALK'
            const isTransit = step.travel_mode === 'TRANSIT'

            const title = isWalking
              ? 'Walk'
              : isTransit
                ? step.line_name || step.line_short_name || 'Public transport'
                : 'Continue'

            return (
              <li
                key={`${recommendation.rental_id}-${index}`}
                className="relative ml-3 border-l border-slate-200 pb-6 pl-7 last:border-l-0 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className={`absolute -left-3 flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isTransit
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {index + 1}
                </span>

                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {title}
                  </h3>

                  {step.distance_meters !== null && (
                    <span className="text-xs text-slate-500">
                      {step.distance_meters < 1000
                        ? `${step.distance_meters} m`
                        : `${(step.distance_meters / 1000).toFixed(1)} km`}
                    </span>
                  )}
                </div>

                {isTransit ? (
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-800">Board:</span>{' '}
                      {step.departure_stop || 'Stop unavailable'}
                    </p>

                    <p>
                      <span className="font-medium text-slate-800">
                        Get off:
                      </span>{' '}
                      {step.arrival_stop || 'Stop unavailable'}
                    </p>

                    {step.headsign && (
                      <p className="text-xs text-slate-500">
                        Towards {step.headsign}
                      </p>
                    )}

                    {step.stop_count !== null && (
                      <p className="text-xs text-slate-500">
                        {step.stop_count}{' '}
                        {step.stop_count === 1 ? 'stop' : 'stops'}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {step.instruction ||
                      (isWalking
                        ? 'Continue walking to the next point.'
                        : 'Continue to the next point.')}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="mt-5 text-sm text-slate-500">
          Route steps are unavailable.
        </p>
      )}

      <div className="mt-6 border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-emerald-800">Arrive at work</p>

        <p className="mt-1 text-sm text-slate-600">
          {destination?.address_en || destination?.address_zh}
        </p>
      </div>
    </div>
  )
}
