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
}

function value(value: string | number | null | undefined, unit = '') {
  if (value == null || !Number.isFinite(Number(value))) return '未知'
  return `${Number(value).toLocaleString('zh-HK', { maximumFractionDigits: 2 })}${unit}`
}

function difference(amount: string | number | null | undefined, unit: string) {
  if (amount == null) return '差值未知'
  const number = Number(amount)
  return `${number > 0 ? '+' : ''}${value(amount, unit)}`
}

const metrics: {
  label: string
  read: (item: RecommendationItem) => string
  delta: keyof ComparisonDifference
  unit: string
  scale?: number
}[] = [
  {
    label: '月租',
    read: (i) => value(i.monthly_rent_hkd, ' HKD'),
    delta: 'rent_hkd',
    unit: ' HKD',
  },
  {
    label: '单程通勤',
    read: (i) => value(i.commute.duration_seconds / 60, ' 分钟'),
    delta: 'commute_seconds',
    unit: ' 分钟',
    scale: 60,
  },
  {
    label: '换乘',
    read: (i) => value(i.commute.transfer_count, ' 次'),
    delta: 'transfers',
    unit: ' 次',
  },
  {
    label: '步行距离',
    read: (i) => value(i.commute.walking_distance_meters, ' 米'),
    delta: 'walking_meters',
    unit: ' 米',
  },
  {
    label: '预计月交通费',
    read: (i) => value(i.estimated_monthly_transport_hkd, ' HKD'),
    delta: 'monthly_transport_hkd',
    unit: ' HKD',
  },
  {
    label: '预计月总支出',
    read: (i) => value(i.estimated_monthly_total_hkd, ' HKD'),
    delta: 'monthly_total_hkd',
    unit: ' HKD',
  },
  {
    label: '预计月碳排放',
    read: (i) => value(i.estimated_monthly_co2e_kg, ' kg CO₂e'),
    delta: 'monthly_co2e_kg',
    unit: ' kg CO₂e',
  },
]

export default function RentalComparison({ result, request, onSelect }: Props) {
  const [selected, setSelected] = useState<number[]>(() => {
    if (result.comparison?.items.length)
      return result.comparison.items.map((i) => i.rental_id)
    const ids = result.ai?.recommendations.map((i) => i.rental_id) ?? []
    return [
      ...new Set([
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
      aria-labelledby="comparison-heading"
      className="m-4 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-6"
    >
      <h2
        id="comparison-heading"
        className="text-xl font-semibold text-slate-900"
      >
        方案对比与推荐结论
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        默认对比 AI 精选与租金较低的备选。也可自行选择 2–3 套比较。
      </p>
      <details className="mt-4 rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium">
          选择对比房源（已选 {selected.length}/3）
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
          {comparison.isPending ? '正在更新路线并分析…' : 'AI 比较所选方案'}
        </Button>
        <span className="text-xs text-slate-500">
          会重新查询路线并生成 AI 分析。
        </span>
      </div>
      {comparison.isPending && (
        <p role="status" className="mt-3 text-sm">
          正在比较，请稍候。下表暂为已有数据。
        </p>
      )}
      {customMatches && comparison.isError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          比较失败，请重试；房源可能已无路线或服务暂时不可用。现有数据仍可查看。
        </p>
      )}
      {!comparison.isPending && !narrative && (
        <p role="status" className="mt-3 text-sm text-slate-500">
          {selected.length < 2
            ? '请至少选择两套房源。'
            : current?.message || '暂无对应的 AI 结论，可点击上方按钮生成。'}
        </p>
      )}
      {items.length > 0 && (
        <>
          <div
            className="mt-4 overflow-x-auto rounded-lg border border-slate-200"
            role="region"
            aria-label="房源数据对比表"
            tabIndex={0}
          >
            <table className="w-full min-w-[620px] text-left text-sm">
              <caption className="p-3 text-left text-xs text-slate-500">
                数值来自房源及路线数据；差值为该方案减去第一列方案，负值代表更少。未知费用不按零计算。
              </caption>
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="p-3">
                    对比项
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
                          AI 优先推荐
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
                      const raw = current?.differences.find(
                        (d) => d.rental_id === item.rental_id,
                      )?.[metric.delta]
                      const delta =
                        raw == null ? null : Number(raw) / (metric.scale ?? 1)
                      return (
                        <td key={item.rental_id} className="p-3">
                          <span>{metric.read(item)}</span>
                          {index > 0 && current && (
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
                  综合结论：优先推荐 #{recommended?.rental_id}{' '}
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
                          <dt className="font-medium text-emerald-800">优势</dt>
                          <dd>{analysis.strengths}</dd>
                          <dt className="font-medium text-amber-800">
                            不足与未知
                          </dt>
                          <dd>{analysis.tradeoffs}</dd>
                          <dt className="font-medium">适合谁</dt>
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
            预算仅限制月租。交通费按每月 22
            个工作日往返估算；碳排放为代理因子估算，不同版本不比较差值。AI
            文字仅供参考，请核对数据；历史房源可用性尚未确认。
          </p>
        </>
      )}
    </section>
  )
}
