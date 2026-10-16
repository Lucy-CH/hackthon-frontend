import { useEffect, useRef, useState } from 'react'

import HongKongMap from '@/components/HongKongMap'
import WorkDestinationInput from '@/components/WorkDestinationInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMutation } from '@tanstack/react-query'
import { getRecommendations } from '@/api/recommendations'
import type { Address } from '@/types/address'

import CommuteRouteDetails from '@/components/CommuteRouteDetails'

type SortOption = 'commute' | 'cost' | 'emissions'

const sortLabels: Record<SortOption, string> = {
  commute: 'Shortest commute',
  cost: 'Lowest total cost',
  emissions: 'Lowest emissions',
}

function sortableNumber(value: string | null): number {
  if (value === null || value.trim() === '') {
    return Number.POSITIVE_INFINITY
  }

  const number = Number(value)

  return Number.isFinite(number) && number >= 0
    ? number
    : Number.POSITIVE_INFINITY
}

const hkdFormatter = new Intl.NumberFormat('en-HK', {
  style: 'currency',
  currency: 'HKD',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

function formatMoney(value: string | null): string {
  return value === null ? 'Unavailable' : hkdFormatter.format(Number(value))
}

export default function CommuteSearchPage() {
  const [workDestination, setWorkDestination] = useState<Address | null>(null)
  const [budget, setBudget] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('commute')

  const budgetAmount = Number(budget)

  const isBudgetValid =
    budget.trim() !== '' &&
    Number.isInteger(budgetAmount) &&
    budgetAmount > 0 &&
    budgetAmount <= 99_999_999

  const [selectedRentalId, setSelectedRentalId] = useState<number | null>(null)

  const firstCardRef = useRef<HTMLButtonElement>(null)

  const recommendation = useMutation({
    mutationFn: getRecommendations,
    retry: false,
    onSuccess: (data) => {
      setSortBy('commute')
      setSelectedRentalId(data.items[0]?.rental_id ?? null)
    },
  })

  const canSearch =
    workDestination !== null &&
    workDestination.latitude !== null &&
    workDestination.longitude !== null &&
    isBudgetValid

  function handleFindHome() {
    if (!canSearch || !workDestination || recommendation.isPending) {
      return
    }

    recommendation.mutate({
      work_address_id: workDestination.id,
      max_monthly_rent_hkd: budgetAmount,
    })
  }

  const matchesCurrentInputs =
    recommendation.variables?.work_address_id === workDestination?.id &&
    recommendation.variables?.max_monthly_rent_hkd === budgetAmount

  const result =
    matchesCurrentInputs && recommendation.isSuccess
      ? recommendation.data
      : null

  const selectedRecommendation =
    result?.items.find((item) => item.rental_id === selectedRentalId) ??
    result?.items[0] ??
    null

  useEffect(() => {
    if (!result?.items.length) {
      return
    }

    firstCardRef.current?.focus({ preventScroll: true })
    firstCardRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
  }, [result])

  const hasResults = Boolean(result?.items.length)

  const emissionsCandidates = (result?.items ?? []).filter((item) => {
    const value = item.estimated_monthly_co2e_kg

    return (
      value !== null &&
      value.trim() !== '' &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 0
    )
  })

  const hasComparableEmissions =
    emissionsCandidates.length >= 2 &&
    new Set(emissionsCandidates.map((item) => item.emission_factor_version))
      .size === 1

  const lowestMonthlyEmissions = hasComparableEmissions
    ? Math.min(
        ...emissionsCandidates.map((item) =>
          Number(item.estimated_monthly_co2e_kg),
        ),
      )
    : null

  const lowestEmissionRentalIds = new Set(
    lowestMonthlyEmissions === null
      ? []
      : emissionsCandidates
          .filter(
            (item) =>
              Number(item.estimated_monthly_co2e_kg) === lowestMonthlyEmissions,
          )
          .map((item) => item.rental_id),
  )

  const sortedRecommendations = [...(result?.items ?? [])].sort((a, b) => {
    let aValue: number
    let bValue: number

    if (sortBy === 'cost') {
      aValue = sortableNumber(a.estimated_monthly_total_hkd)
      bValue = sortableNumber(b.estimated_monthly_total_hkd)
    } else if (sortBy === 'emissions') {
      aValue = sortableNumber(a.estimated_monthly_co2e_kg)
      bValue = sortableNumber(b.estimated_monthly_co2e_kg)
    } else {
      aValue = a.commute.duration_seconds
      bValue = b.commute.duration_seconds
    }

    if (aValue < bValue) return -1
    if (aValue > bValue) return 1

    // Break ties by commute time, rent, then ID.
    return (
      a.commute.duration_seconds - b.commute.duration_seconds ||
      Number(a.monthly_rent_hkd) - Number(b.monthly_rent_hkd) ||
      a.rental_id - b.rental_id
    )
  })

  return (
    <main className="flex min-h-dvh flex-col bg-slate-50 lg:h-dvh">
      <header
        className={
          hasResults
            ? 'shrink-0 border-b border-slate-200 bg-white px-6 py-4'
            : 'my-auto w-full px-6 py-12'
        }
      >
        <div className={hasResults ? '' : 'mx-auto max-w-4xl text-center'}>
          <p className="text-sm font-semibold tracking-wide text-emerald-700">
            Hong Kong Rent & Commute
          </p>

          <h1
            className={
              hasResults
                ? 'mt-2 text-xl font-bold text-slate-900'
                : 'mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl'
            }
          >
            {hasResults ? (
              'Your home search'
            ) : (
              <>
                Find a home.
                <br />
                Simplify your commute.
              </>
            )}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
            Compare rent and public transport costs to find a home that works
            for you.
          </p>
        </div>

        <div
          className={
            hasResults
              ? 'mt-4 max-w-5xl space-y-3'
              : 'mx-auto mt-8 max-w-4xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'
          }
        >
          <div
            className={
              hasResults
                ? 'grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]'
                : 'grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,1fr)_240px]'
            }
          >
            <WorkDestinationInput onSelect={setWorkDestination} />

            <div className="space-y-2">
              <label
                htmlFor="rent-budget"
                className="block text-sm font-medium"
              >
                Monthly rent budget (HKD)
              </label>

              <Input
                id="rent-budget"
                type="number"
                inputMode="numeric"
                min={1}
                max={99_999_999}
                step={1}
                placeholder="e.g. 12000"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                aria-describedby="rent-budget-hint"
              />
            </div>

            <Button
              type="button"
              disabled={!canSearch || recommendation.isPending}
              onClick={handleFindHome}
              aria-busy={recommendation.isPending}
              className={
                hasResults
                  ? 'w-full md:w-auto'
                  : 'h-11 w-full bg-emerald-700 hover:bg-emerald-800 md:col-span-2'
              }
            >
              {recommendation.isPending ? 'Finding homes...' : 'Find my home'}
            </Button>
          </div>

          <p id="rent-budget-hint" className="text-xs text-muted-foreground">
            Monthly rent only. Transport costs are calculated separately.
          </p>

          {recommendation.isPending && (
            <div role="status" className="space-y-3">
              <div
                aria-hidden="true"
                className="h-1 overflow-hidden rounded-full bg-emerald-100"
              >
                <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-600" />
              </div>

              <p className="text-sm text-muted-foreground">
                Checking public transport routes. This may take a moment.
              </p>
            </div>
          )}

          {matchesCurrentInputs && recommendation.isError && (
            <p role="alert" className="text-sm text-destructive">
              Unable to load recommendations. Please try again.
            </p>
          )}

          {matchesCurrentInputs && recommendation.isSuccess && (
            <p role="status" className="text-sm text-muted-foreground">
              {recommendation.data.items.length > 0
                ? `Found ${recommendation.data.items.length} homes with commute options.`
                : 'No homes with commute options were found within this rent budget.'}
            </p>
          )}
        </div>

        {!hasResults && (
          <div className="mx-auto mt-6 max-w-4xl text-center text-xs leading-relaxed text-slate-500">
            <p>
              Public transport · Arrive by 9:30 AM · 22 commuting days / month
            </p>
            <p className="mt-2">
              Your map and commute options appear after you search.
            </p>
          </div>
        )}
      </header>

      {hasResults && (
        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[400px_minmax(0,1fr)] lg:overflow-hidden">
          {result && result.items.length > 0 && (
            <aside
              aria-label="Rental recommendations"
              className="min-h-0 space-y-4 bg-slate-50 p-4 lg:overflow-y-auto lg:border-r lg:border-slate-200"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {result.items.length} homes within your rent budget
                </h2>
                <p className="mt-1 text-xs text-slate-500" aria-live="polite">
                  {sortLabels[sortBy]} first · Arrive by 9:30 AM
                </p>

                <div className="mt-3">
                  <label
                    htmlFor="recommendation-sort"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Sort by
                  </label>

                  <select
                    id="recommendation-sort"
                    value={sortBy}
                    onChange={(event) => {
                      const value = event.target.value

                      if (
                        value === 'commute' ||
                        value === 'cost' ||
                        value === 'emissions'
                      ) {
                        setSortBy(value)
                      }
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20"
                  >
                    <option value="commute">Shortest commute</option>
                    <option value="cost">Lowest total cost</option>
                    <option
                      value="emissions"
                      disabled={!hasComparableEmissions}
                    >
                      Lowest emissions
                    </option>
                  </select>
                </div>
                {lowestEmissionRentalIds.size > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Emissions labels compare available estimates in these
                    results only.
                  </p>
                )}
              </div>

              {sortedRecommendations.map((item, index) => {
                const isSelected =
                  selectedRecommendation?.rental_id === item.rental_id

                const minutes = Math.ceil(item.commute.duration_seconds / 60)
                const transfers = item.commute.transfer_count

                return (
                  <button
                    key={item.rental_id}
                    ref={index === 0 ? firstCardRef : undefined}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedRentalId(item.rental_id)}
                    className={`block w-full rounded-2xl border-2 p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <span className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                      <span>
                        {String(index + 1).padStart(2, '0')} · {item.district}
                      </span>
                      {isSelected && <span>Selected</span>}
                    </span>
                    {lowestEmissionRentalIds.has(item.rental_id) && (
                      <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                        Lowest estimated emissions
                      </span>
                    )}

                    <span className="mt-3 block text-base font-semibold text-slate-900">
                      {item.title}
                    </span>

                    <span className="mt-1 block text-sm text-slate-600">
                      {item.address}
                    </span>

                    <span className="mt-4 block text-sm text-slate-600">
                      About {minutes} min one way ·{' '}
                      {transfers === 0
                        ? 'No transfers'
                        : `${transfers} transfer${transfers === 1 ? '' : 's'}`}
                    </span>
                    <span className="mt-3 block rounded-lg bg-emerald-50 px-3 py-2">
                      <span className="block text-xs font-medium text-emerald-800">
                        Est. monthly commute emissions
                      </span>

                      <span className="mt-1 block text-sm font-semibold text-emerald-900">
                        {item.estimated_monthly_co2e_kg === null
                          ? 'Unavailable'
                          : `${Number(item.estimated_monthly_co2e_kg).toFixed(2)} kg CO₂e`}
                      </span>

                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                        UK proxy factors · 22 return commutes / month
                      </span>
                    </span>

                    <span className="mt-4 block space-y-2 border-t border-slate-200 pt-3">
                      <span className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-slate-600">Monthly rent</span>
                        <span className="font-semibold text-slate-900">
                          {formatMoney(item.monthly_rent_hkd)}
                        </span>
                      </span>

                      <span className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-slate-600">Est. transport</span>
                        <span className="font-medium text-slate-900">
                          {formatMoney(item.estimated_monthly_transport_hkd)}
                        </span>
                      </span>

                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-emerald-800">
                          Est. total / month
                        </span>
                        <span className="text-lg font-bold text-emerald-800">
                          {formatMoney(item.estimated_monthly_total_hkd)}
                        </span>
                      </span>
                    </span>
                  </button>
                )
              })}

              <p className="text-xs leading-relaxed text-slate-500">
                Historical listing snapshots; availability is not verified.
                Transport estimates assume 22 commuting days and equal fares in
                both directions.
              </p>
            </aside>
          )}

          <section
            aria-label="Commute map and route"
            className="min-h-0 bg-slate-50 lg:overflow-y-auto"
          >
            <div className="h-[400px]">
              <HongKongMap
                destination={workDestination}
                recommendation={selectedRecommendation}
              />
            </div>

            {selectedRecommendation && (
              <div className="p-4">
                <CommuteRouteDetails
                  recommendation={selectedRecommendation}
                  destination={workDestination}
                />
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
