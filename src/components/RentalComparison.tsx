import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { compareRecommendations } from '@/api/recommendations'
import { Button } from '@/components/ui/button'
import type {
  ComparisonDifference,
  RecommendationItem,
  RecommendationRequest,
  RecommendationResponse,
} from '@/types/recommendation'

interface Props {
  result: RecommendationResponse
  request: RecommendationRequest
  onSelect: (id: number) => void
  initialRentalId?: number
}

function value(value: string | number | null | undefined, unit = '') {
  if (value == null || !Number.isFinite(Number(value))) return 'Unknown'
  return `${Number(value).toLocaleString('en-HK', { maximumFractionDigits: 2 })}${unit}`
}

function difference(amount: string | number | null | undefined, unit: string) {
  if (amount == null) return 'Difference unavailable'
  const number = Number(amount)
  return `${number > 0 ? '+' : ''}${value(amount, unit)}`
}

const metrics: {
  label: string
  read: (item: RecommendationItem) => string
  delta: keyof ComparisonDifference | null
  unit: string
  scale?: number
}[] = [
  {
    label: 'Bedrooms',
    read: (i) =>
      i.bedrooms == null
        ? 'Unknown'
        : i.bedrooms === 0
          ? 'Studio'
          : String(i.bedrooms),
    delta: null,
    unit: '',
  },
  {
    label: 'Saleable area',
    read: (i) => value(i.saleable_area_sqft, ' sq ft'),
    delta: null,
    unit: '',
  },
  {
    label: 'Monthly rent',
    read: (i) => value(i.monthly_rent_hkd, ' HKD'),
    delta: 'rent_hkd',
    unit: ' HKD',
  },
  {
    label: 'One-way commute',
    read: (i) => value(i.commute.duration_seconds / 60, ' min'),
    delta: 'commute_seconds',
    unit: ' min',
    scale: 60,
  },
  {
    label: 'Transfers',
    read: (i) => value(i.commute.transfer_count, ''),
    delta: 'transfers',
    unit: '',
  },
  {
    label: 'Walking distance',
    read: (i) => value(i.commute.walking_distance_meters, ' m'),
    delta: 'walking_meters',
    unit: ' m',
  },
  {
    label: 'Est. monthly transport',
    read: (i) => value(i.estimated_monthly_transport_hkd, ' HKD'),
    delta: 'monthly_transport_hkd',
    unit: ' HKD',
  },
  {
    label: 'Est. monthly total',
    read: (i) => value(i.estimated_monthly_total_hkd, ' HKD'),
    delta: 'monthly_total_hkd',
    unit: ' HKD',
  },
  {
    label: 'Est. monthly emissions',
    read: (i) => value(i.estimated_monthly_co2e_kg, ' kg CO₂e'),
    delta: 'monthly_co2e_kg',
    unit: ' kg CO₂e',
  },
]

export default function RentalComparison({
  result,
  request,
  onSelect,
  initialRentalId,
}: Props) {
  const [selected, setSelected] = useState<number[]>(() => {
    if (!initialRentalId && result.comparison?.items.length)
      return result.comparison.items.map((i) => i.rental_id)
    const ids = result.ai?.recommendations.map((i) => i.rental_id) ?? []
    return [
      ...new Set([
        ...(initialRentalId ? [initialRentalId] : []),
        ...ids,
        ...[...result.items]
          .sort(
            (a, b) => Number(a.monthly_rent_hkd) - Number(b.monthly_rent_hkd),
          )
          .map((i) => i.rental_id),
      ]),
    ].slice(0, 3)
  })
  const comparison = useMutation({
    mutationFn: compareRecommendations,
    retry: false,
  })
  const selectionKey = selected.join(',')
  const customMatches =
    comparison.variables?.rental_ids.join(',') === selectionKey
  const defaultMatches =
    result.comparison?.items.map((i) => i.rental_id).join(',') === selectionKey
  const current =
    customMatches && comparison.isSuccess
      ? comparison.data
      : defaultMatches &&
          !comparison.isPending &&
          !(customMatches && comparison.isError)
        ? result.comparison
        : null
  const items =
    current?.items ??
    selected.flatMap((id) => result.items.filter((i) => i.rental_id === id))
  const narrative = current?.narrative
  const recommended = items.find(
    (i) => i.rental_id === narrative?.recommended_rental_id,
  )

  return (
    <section
      lang="en"
      aria-labelledby="comparison-heading"
      className="m-4 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-6"
    >
      <h2
        id="comparison-heading"
        className="text-xl font-semibold text-slate-900"
      >
        Compare homes & recommendation
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Compare AI picks with lower-rent alternatives, or choose 2–3 homes
        yourself.
      </p>
      <details className="mt-4 rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Choose homes to compare ({selected.length}/3 selected)
        </summary>
        <div className="mt-3 max-h-56 space-y-2 overflow-auto">
          {result.items.map((item) => (
            <label
              key={item.rental_id}
              className="flex items-start gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.rental_id)}
                disabled={
                  comparison.isPending ||
                  (!selected.includes(item.rental_id) && selected.length >= 3)
                }
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? [...ids, item.rental_id]
                      : ids.filter((id) => id !== item.rental_id),
                  )
                }
                className="mt-1 accent-emerald-700"
              />
              <span>
                #{item.rental_id} {item.title} ·{' '}
                {value(item.monthly_rent_hkd, ' HKD')}
              </span>
            </label>
          ))}
        </div>
      </details>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          disabled={selected.length < 2 || comparison.isPending}
          onClick={() =>
            comparison.mutate({
              ...request,
              include_ai: true,
              rental_ids: selected,
            })
          }
        >
          {comparison.isPending
            ? 'Updating routes and comparing…'
            : 'Compare selected homes with AI'}
        </Button>
        <span className="text-xs text-slate-500">
          Refreshes routes and generates a new AI comparison.
        </span>
      </div>
      {comparison.isPending && (
        <p role="status" className="mt-3 text-sm">
          Comparing homes. The table shows existing data while updates are
          loading.
        </p>
      )}
      {customMatches && comparison.isError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          Comparison failed. A route may no longer be available or the service
          may be temporarily unavailable. Existing data is still shown; please
          try again.
        </p>
      )}
      {!comparison.isPending && !narrative && (
        <p role="status" className="mt-3 text-sm text-slate-500">
          {selected.length < 2
            ? 'Select at least two homes.'
            : current?.message ||
              'No AI conclusion for this selection yet. Use the button above to generate one.'}
        </p>
      )}
      {items.length > 0 && (
        <>
          <div
            className="mt-4 overflow-x-auto rounded-lg border border-slate-200"
            role="region"
            aria-label="Home comparison table"
            tabIndex={0}
          >
            <table className="w-full min-w-[620px] text-left text-sm">
              <caption className="p-3 text-left text-xs text-slate-500">
                Values come from listing and route data. Differences are
                relative to the first home; negative values mean less. Unknown
                costs are not treated as zero.
              </caption>
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="p-3">
                    Metric
                  </th>
                  {items.map((i) => (
                    <th
                      key={i.rental_id}
                      scope="col"
                      className="min-w-40 p-3 align-top"
                    >
                      <button
                        className="text-left text-emerald-800 underline"
                        onClick={() => onSelect(i.rental_id)}
                      >
                        #{i.rental_id} {i.title}
                      </button>
                      {i.rental_id === recommended?.rental_id && (
                        <span className="mt-2 block text-xs text-emerald-700">
                          AI top choice
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr key={metric.label} className="border-t border-slate-100">
                    <th scope="row" className="p-3 font-medium">
                      {metric.label}
                    </th>
                    {items.map((item, index) => {
                      const raw =
                        metric.delta === null
                          ? null
                          : current?.differences.find(
                              (d) => d.rental_id === item.rental_id,
                            )?.[metric.delta]
                      const delta =
                        raw == null ? null : Number(raw) / (metric.scale ?? 1)
                      return (
                        <td key={item.rental_id} className="p-3">
                          <span>{metric.read(item)}</span>
                          {index > 0 && current && metric.delta !== null && (
                            <span className="mt-1 block text-xs text-slate-500">
                              {difference(delta, metric.unit)}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {narrative && (
            <>
              <div
                className="mt-4 rounded-xl bg-emerald-50 p-4"
                aria-live="polite"
              >
                <h3 className="font-semibold text-emerald-900">
                  Overall recommendation: #{recommended?.rental_id}{' '}
                  {recommended?.title}
                </h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                  {narrative.conclusion}
                </p>
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-3">
                {items.map((item) => {
                  const analysis = narrative.analyses.find(
                    (a) => a.rental_id === item.rental_id,
                  )
                  return (
                    analysis && (
                      <article
                        key={item.rental_id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <h3 className="font-semibold">
                          #{item.rental_id} {item.title}
                        </h3>
                        <dl className="mt-3 space-y-2 text-sm leading-relaxed">
                          <dt className="font-medium text-emerald-800">
                            Strengths
                          </dt>
                          <dd>{analysis.strengths}</dd>
                          <dt className="font-medium text-amber-800">
                            Tradeoffs & unknowns
                          </dt>
                          <dd>{analysis.tradeoffs}</dd>
                          <dt className="font-medium">Best suited to</dt>
                          <dd>{analysis.suitable_for}</dd>
                        </dl>
                      </article>
                    )
                  )
                })}
              </div>
            </>
          )}
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            The budget applies to rent only. Transport estimates assume 22
            return commutes per month. Emissions use proxy factors; differences
            are not compared across factor versions. Check AI explanations
            against the data. Historical listing availability is not verified.
          </p>
        </>
      )}
    </section>
  )
}
