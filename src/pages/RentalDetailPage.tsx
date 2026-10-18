import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { analyzeRental, getRentalDetail } from '@/api/recommendations'
import RentalComparison from '@/components/RentalComparison'
import CommuteRouteDetails from '@/components/CommuteRouteDetails'
import { Button } from '@/components/ui/button'
import type {
  RecommendationRequest,
  RecommendationResponse,
} from '@/types/recommendation'
import type { Address } from '@/types/address'

interface Props {
  rentalId: number
  result: RecommendationResponse | null
  request?: RecommendationRequest
  destination: Address | null
}

function savedContext(): RecommendationRequest | undefined {
  try {
    const data = JSON.parse(
      sessionStorage.getItem('rental-search-context') ?? 'null',
    )
    if (
      data &&
      Number.isInteger(data.work_address_id) &&
      data.work_address_id > 0 &&
      Number.isFinite(data.max_monthly_rent_hkd) &&
      data.max_monthly_rent_hkd > 0 &&
      typeof data.preferences === 'string'
    )
      return data
  } catch {
    /* A direct link still shows property facts. */
  }
}

const detailLabels: Record<string, string> = {
  property_type: 'Property type',
  bathrooms: 'Bathrooms',
  floor: 'Floor',
  kitchen_type: 'Kitchen type',
  building_age_years: 'Building age (years)',
  estate: 'Estate',
  rent_includes: 'Rent includes',
  subletting: 'Subletting',
  cooking_method: 'Cooking facilities',
  sharing_type: 'Sharing arrangement',
  sharing_terms: 'Sharing terms',
}

export default function RentalDetailPage({
  rentalId,
  result,
  request,
  destination,
}: Props) {
  const [context] = useState(() => request ?? savedContext())
  const [tab, setTab] = useState<'overview' | 'compare' | 'commute'>('overview')
  const cached = result?.items.find((i) => i.rental_id === rentalId)
  const detail = useQuery({
    queryKey: ['rental-detail', rentalId],
    queryFn: () => getRentalDetail(rentalId),
    initialData: cached,
    retry: false,
  })
  const analysis = useMutation({
    mutationFn: () => analyzeRental(rentalId, context!),
    retry: false,
  })
  const home = detail.data
  const assessedHome = analysis.data?.items[0] ?? cached
  const narrative = analysis.data?.narrative
  const assessment = narrative?.analyses.find((a) => a.rental_id === rentalId)
  const pick = result?.ai?.recommendations.find((p) => p.rental_id === rentalId)
  const safeUrl =
    home?.listing_url && /^https?:\/\//i.test(home.listing_url)
      ? home.listing_url
      : null

  return (
    <main lang="en" className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <a href="#" className="text-sm font-semibold text-emerald-800">
            ← Back to search
          </a>
          <span className="text-sm font-medium text-slate-500">
            Hong Kong Rent & Commute
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {detail.isPending && <p role="status">Loading property details…</p>}
        {detail.isError && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-amber-50 p-4 text-amber-900"
          >
            Unable to refresh this listing.{' '}
            {home
              ? 'Showing your search snapshot.'
              : 'The listing may not exist or the service may be unavailable.'}{' '}
            <button className="underline" onClick={() => detail.refetch()}>
              Retry
            </button>
          </p>
        )}
        {home && (
          <>
            <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-[minmax(0,1fr)_240px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {home.district} · Property #{home.rental_id}
                </p>
                <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                  {home.title}
                </h1>
                <p className="mt-3 text-sm text-slate-500">{home.address}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-lg bg-slate-100 px-3 py-2">
                    {home.bedrooms == null
                      ? 'Bedrooms unknown'
                      : home.bedrooms === 0
                        ? 'Studio'
                        : `${home.bedrooms} bedrooms`}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-3 py-2">
                    {home.saleable_area_sqft
                      ? `${Number(home.saleable_area_sqft).toLocaleString('en-HK')} sq ft saleable`
                      : 'Saleable area unknown'}
                  </span>
                  {assessedHome && (
                    <span className="rounded-lg bg-slate-100 px-3 py-2">
                      {Math.ceil(assessedHome.commute.duration_seconds / 60)}{' '}
                      min commute
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-center rounded-xl bg-emerald-50 p-5">
                <p className="text-sm text-emerald-800">Monthly rent</p>
                <p className="mt-2 text-3xl font-bold text-emerald-950">
                  HKD {Number(home.monthly_rent_hkd).toLocaleString('en-HK')}
                </p>
                <p className="mt-2 text-xs text-emerald-800">
                  Transport is calculated separately.
                </p>
                {safeUrl && (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 text-sm font-semibold text-emerald-800 underline"
                  >
                    Open original listing ↗
                  </a>
                )}
              </div>
            </section>
            <nav
              aria-label="Property sections"
              className="my-6 flex flex-wrap gap-2"
            >
              {(['overview', 'compare', 'commute'] as const).map((name) => (
                <button
                  key={name}
                  aria-current={tab === name ? 'page' : undefined}
                  onClick={() => setTab(name)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold ${tab === name ? 'bg-emerald-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                >
                  {name === 'overview'
                    ? 'Details & AI assessment'
                    : name === 'compare'
                      ? 'Compare alternatives'
                      : 'Commute details'}
                </button>
              ))}
            </nav>
            {tab === 'overview' && (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="text-lg font-semibold">Property facts</h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Source listing information. Descriptions and inclusions have
                    not been independently verified.
                  </p>
                  <dl className="mt-4 divide-y divide-slate-100">
                    {Object.entries(detailLabels).map(([key, label]) => (
                      <div
                        key={key}
                        className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 py-3 text-sm"
                      >
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="break-words text-slate-900">
                          {home.property_details?.[key] || 'Unknown'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <h3 className="mt-6 font-semibold">Listing description</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                    {home.property_details?.description ||
                      'No description supplied.'}
                  </p>
                  <p className="mt-5 text-xs text-slate-500">
                    Snapshot:{' '}
                    {new Date(home.fetched_at).toLocaleDateString('en-HK')}.
                    Availability is not verified.
                  </p>
                </section>
                <section className="rounded-2xl border border-emerald-200 bg-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Personalized assessment
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    Does this home fit your needs?
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Weigh space, bedrooms, listing conditions, rent and your
                    commute against your search preferences.
                  </p>
                  {context?.preferences && (
                    <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                      Your preferences: {context.preferences}
                    </p>
                  )}
                  {context ? (
                    <Button
                      className="mt-4"
                      disabled={analysis.isPending}
                      onClick={() => analysis.mutate()}
                    >
                      {analysis.isPending
                        ? 'Checking route and analyzing…'
                        : narrative
                          ? 'Refresh AI assessment'
                          : 'Analyze this home with AI'}
                    </Button>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600">
                      <a href="#" className="text-emerald-800 underline">
                        Search with a work destination and budget
                      </a>{' '}
                      to get a personalized assessment.
                    </p>
                  )}
                  {analysis.isPending && (
                    <p role="status" className="mt-3 text-sm text-slate-500">
                      Refreshing commute data and assessing this property. This
                      may take a moment.
                    </p>
                  )}
                  {analysis.isError && (
                    <p role="alert" className="mt-3 text-sm text-amber-800">
                      Assessment unavailable. Check your budget and route
                      configuration, then try again. Property facts remain
                      available.
                    </p>
                  )}
                  {analysis.data && !narrative && (
                    <p role="status" className="mt-3 text-sm text-slate-500">
                      {analysis.data.message ||
                        'AI assessment is currently unavailable. You can still review the property facts.'}
                    </p>
                  )}
                  {assessment && narrative ? (
                    <>
                      <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-950">
                        {narrative.conclusion}
                      </p>
                      <h3 className="mt-5 font-semibold text-emerald-800">
                        Why it could work
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                        {assessment.strengths}
                      </p>
                      <h3 className="mt-5 font-semibold text-amber-800">
                        Why it may not work
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                        {assessment.tradeoffs}
                      </p>
                      <h3 className="mt-5 font-semibold">Best suited to</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {assessment.suitable_for}
                      </p>
                    </>
                  ) : (
                    pick &&
                    !analysis.isPending && (
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <h3 className="font-semibold">
                          Initial search recommendation
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed">
                          {pick.reason}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                          {pick.tradeoff}
                        </p>
                      </div>
                    )
                  )}
                  <p className="mt-5 text-xs leading-relaxed text-slate-500">
                    AI explanations may be inaccurate. Missing information is
                    unknown, not a benefit or a confirmed drawback. Verify all
                    claims with the listing provider.
                  </p>
                </section>
              </div>
            )}
            {tab === 'compare' &&
              (result && context ? (
                <RentalComparison
                  result={result}
                  request={context}
                  onSelect={(id) => {
                    window.location.hash = `/homes/${id}`
                  }}
                  initialRentalId={rentalId}
                />
              ) : (
                <div className="rounded-xl bg-white p-6">
                  Return to search to compare this home with other results.
                </div>
              ))}
            {tab === 'commute' &&
              (assessedHome ? (
                <CommuteRouteDetails
                  recommendation={assessedHome}
                  destination={destination}
                />
              ) : (
                <p className="rounded-xl bg-white p-6">
                  Run a search or generate an assessment to see commute details.
                </p>
              ))}
          </>
        )}
      </div>
    </main>
  )
}
