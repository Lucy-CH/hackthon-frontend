import { useEffect, useRef, useState } from 'react'

import RentalDetailPage from '@/pages/RentalDetailPage'
import AIRecommendations from '@/components/AIRecommendations'
import { Textarea } from '@/components/ui/textarea'
import HongKongMap from '@/components/HongKongMap'
import WorkDestinationInput from '@/components/WorkDestinationInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMutation } from '@tanstack/react-query'
import { getRecommendations } from '@/api/recommendations'
import type { Address } from '@/types/address'

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
  const [detailId, setDetailId] = useState<number | null>(() => {
    const match = window.location.hash.match(/^#\/homes\/(\d+)$/)
    return match ? Number(match[1]) : null
  })
  useEffect(() => {
    const update = () => {
      const match = window.location.hash.match(/^#\/homes\/(\d+)$/)
      setDetailId(match ? Number(match[1]) : null)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  const [workDestination, setWorkDestination] = useState<Address | null>(null)
  const [budget, setBudget] = useState('')
  const [includeAI, setIncludeAI] = useState(true)
  const [preferences, setPreferences] = useState('')
  const [pickCount, setPickCount] = useState<1 | 2>(2)
  const [sortBy, setSortBy] = useState<SortOption>('commute')

  const budgetAmount = Number(budget)

  const isBudgetValid =
    budget.trim() !== '' &&
    Number.isInteger(budgetAmount) &&
    budgetAmount > 0 &&
    budgetAmount <= 99_999_999

  const [selectedRentalId, setSelectedRentalId] = useState<number | null>(null)

  const resultsPanelRef = useRef<HTMLElement>(null)
  const routePanelRef = useRef<HTMLElement>(null)

  const recommendation = useMutation({
    mutationFn: getRecommendations,
    retry: false,
    onSuccess: (data, variables) => {
      try {
        sessionStorage.setItem(
          'rental-search-context',
          JSON.stringify(variables),
        )
      } catch {
        /* Optional reload support. */
      }
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
      include_ai: includeAI,
      preferences: includeAI ? preferences.trim() : '',
      ai_recommendation_count: pickCount,
    })
  }

  const matchesCurrentInputs =
    recommendation.variables?.work_address_id === workDestination?.id &&
    recommendation.variables?.max_monthly_rent_hkd === budgetAmount &&
    recommendation.variables?.include_ai === includeAI &&
    recommendation.variables?.preferences ===
      (includeAI ? preferences.trim() : '') &&
    recommendation.variables?.ai_recommendation_count === pickCount

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

    resultsPanelRef.current?.focus({ preventScroll: true })
    resultsPanelRef.current?.scrollTo({ top: 0 })
  }, [result])

  useEffect(() => {
    routePanelRef.current?.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [selectedRecommendation?.rental_id])

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
    <>
      <main
        className={
          detailId !== null
            ? 'hidden'
            : 'flex min-h-dvh flex-col bg-slate-50 lg:h-dvh'
        }
      >
        <header
          className={
            hasResults
              ? 'grid shrink-0 gap-4 border-b border-slate-200 bg-white px-6 py-4 lg:grid-cols-[240px_minmax(0,1fr)]'
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

            {!hasResults && (
              <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
                Compare rent and public transport costs to find a home that
                works for you.
              </p>
            )}
          </div>

          <div
            className={
              hasResults
                ? 'w-full space-y-2'
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
              <WorkDestinationInput
                onSelect={setWorkDestination}
                disabled={recommendation.isPending}
              />

              <div className="space-y-2">
                <label
                  htmlFor="rent-budget"
                  className="block text-sm font-medium"
                >
                  Monthly rent budget (HKD)
                </label>

                <Input
                  id="rent-budget"
                  disabled={recommendation.isPending}
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

            <details
              key={hasResults ? 'compact' : 'expanded'}
              open={!hasResults}
              className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-left"
            >
              <summary className="cursor-pointer text-sm font-medium text-emerald-900">
                AI preferences · {includeAI ? 'On' : 'Off'}
                {preferences ? ' · Custom preferences' : ''}
              </summary>
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <input
                    type="checkbox"
                    checked={includeAI}
                    onChange={(event) => setIncludeAI(event.target.checked)}
                    disabled={recommendation.isPending}
                    className="size-4 accent-emerald-700"
                  />
                  Get AI picks from homes within my budget
                </label>
                {includeAI && (
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                    <div>
                      <label
                        htmlFor="housing-preferences"
                        className="mb-2 block text-sm font-medium"
                      >
                        What matters to you? (optional)
                      </label>
                      <Textarea
                        id="housing-preferences"
                        value={preferences}
                        onChange={(event) => setPreferences(event.target.value)}
                        disabled={recommendation.isPending}
                        maxLength={1000}
                        rows={2}
                        placeholder="e.g. Lower rent, fewer transfers, less walking"
                        aria-describedby="ai-preferences-hint"
                        className="bg-white"
                      />
                      <p
                        id="ai-preferences-hint"
                        className="mt-1 text-xs text-slate-500"
                      >
                        Preferences are sent to DeepSeek with listing summaries.
                        Avoid personal details. {preferences.length}/1000
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="ai-pick-count"
                        className="mb-2 block text-sm font-medium"
                      >
                        AI picks
                      </label>
                      <select
                        id="ai-pick-count"
                        value={pickCount}
                        onChange={(event) =>
                          setPickCount(event.target.value === '1' ? 1 : 2)
                        }
                        disabled={recommendation.isPending}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-emerald-700"
                      >
                        <option value="1">1 home</option>
                        <option value="2">2 homes</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </details>

            {recommendation.isPending && (
              <div role="status" className="space-y-3">
                <div
                  aria-hidden="true"
                  className="h-1 overflow-hidden rounded-full bg-emerald-100"
                >
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-600" />
                </div>

                <p className="text-sm text-muted-foreground">
                  {includeAI
                    ? 'Checking routes and preparing AI picks. This may take a moment.'
                    : 'Checking public transport routes. This may take a moment.'}
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
                ref={resultsPanelRef}
                tabIndex={-1}
                aria-label="Rental recommendations"
                className="min-h-0 space-y-4 bg-slate-50 p-4 lg:overflow-y-auto lg:border-r lg:border-slate-200"
              >
                <AIRecommendations
                  result={result}
                  requested={recommendation.variables?.include_ai ?? false}
                  selectedRentalId={selectedRecommendation?.rental_id ?? null}
                  onSelect={setSelectedRentalId}
                />
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
                    <article
                      key={item.rental_id}
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

                      <span className="mt-2 block text-sm text-slate-600">
                        {item.bedrooms == null
                          ? 'Bedrooms unknown'
                          : item.bedrooms === 0
                            ? 'Studio'
                            : `${item.bedrooms} bedrooms`}
                        {' · '}
                        {item.saleable_area_sqft
                          ? `${Number(item.saleable_area_sqft).toLocaleString('en-HK')} sq ft`
                          : 'Area unknown'}
                      </span>
                      <span className="mt-4 block text-sm text-slate-600">
                        About {minutes} min one way ·{' '}
                        {transfers === 0
                          ? 'No transfers'
                          : `${transfers} transfer${transfers === 1 ? '' : 's'}`}
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
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedRentalId(item.rental_id)}
                          className="text-sm font-medium text-slate-600 hover:text-emerald-800"
                        >
                          {isSelected ? 'On map' : 'Show on map'}
                        </button>
                        <a
                          href={`#/homes/${item.rental_id}`}
                          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                        >
                          View details →
                        </a>
                      </div>
                    </article>
                  )
                })}

                <p className="text-xs leading-relaxed text-slate-500">
                  Historical listing snapshots; availability is not verified.
                  Transport estimates assume 22 commuting days and equal fares
                  in both directions.
                </p>
              </aside>
            )}

            <section
              ref={routePanelRef}
              aria-label="Commute map and route"
              className="min-h-0 bg-slate-50 lg:overflow-y-auto"
            >
              {selectedRecommendation && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-4">
                  <div>
                    <p className="text-xs font-medium text-emerald-700">
                      SELECTED HOME
                    </p>
                    <h2 className="mt-1 font-semibold">
                      {selectedRecommendation.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {Math.ceil(
                        selectedRecommendation.commute.duration_seconds / 60,
                      )}{' '}
                      min commute ·{' '}
                      {formatMoney(selectedRecommendation.monthly_rent_hkd)} /
                      month
                    </p>
                  </div>
                  <a
                    href={`#/homes/${selectedRecommendation.rental_id}`}
                    className="text-sm font-semibold text-emerald-800 underline"
                  >
                    View details & AI analysis →
                  </a>
                </div>
              )}
              <div className="h-[520px] lg:h-[calc(100%-100px)] lg:min-h-[400px]">
                <HongKongMap
                  destination={workDestination}
                  recommendation={selectedRecommendation}
                />
              </div>
            </section>
          </div>
        )}
      </main>
      {detailId !== null && (
        <RentalDetailPage
          key={detailId}
          rentalId={detailId}
          result={result}
          request={recommendation.variables}
          destination={workDestination}
        />
      )}
    </>
  )
}
