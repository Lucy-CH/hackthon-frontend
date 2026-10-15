import { useState } from 'react'

import HongKongMap from '@/components/HongKongMap'
import WorkDestinationInput from '@/components/WorkDestinationInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Address } from '@/types/address'
import { useMutation } from '@tanstack/react-query'

import { getRecommendations } from '@/api/recommendations'

export default function CommuteSearchPage() {
  const [workDestination, setWorkDestination] = useState<Address | null>(null)
  const [budget, setBudget] = useState('')

  const budgetAmount = Number(budget)

  const isBudgetValid =
    budget.trim() !== '' &&
    Number.isInteger(budgetAmount) &&
    budgetAmount > 0 &&
    budgetAmount <= 99_999_999

  const recommendation = useMutation({
    mutationFn: getRecommendations,
    retry: false,
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

  return (
    <main className="flex h-dvh flex-col bg-slate-50">
      <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-slate-900">
          Hong Kong Rent & Commute
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Find a home within your budget, with an easier, greener commute.
        </p>

        <div className="mt-4 max-w-5xl space-y-2">
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
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
              className="w-full md:w-auto"
            >
              {recommendation.isPending ? 'Finding homes...' : 'Find my home'}
            </Button>
          </div>

          <p id="rent-budget-hint" className="text-xs text-muted-foreground">
            Monthly rent only. Transport costs are calculated separately.
          </p>

          {recommendation.isPending && (
            <p role="status" className="text-sm text-muted-foreground">
              Checking public transport routes. This may take a moment.
            </p>
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
