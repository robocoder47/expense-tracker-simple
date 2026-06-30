import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatChf, monthLabel, monthLabelShort } from '../lib/calculations'

export interface TrendPoint {
  month: string
  total: number
  delta: number | null
  deltaPct: number | null
}

interface TrendLineChartProps {
  data: TrendPoint[]
}

export function TrendLineChart({ data }: TrendLineChartProps) {
  if (data.length === 0) {
    return <p className="empty">no data for chart</p>
  }

  const formatted = data.map((d) => ({
    ...d,
    label: monthLabelShort(d.month),
  }))

  const avg = data.reduce((s, d) => s + d.total, 0) / data.length

  return (
    <div className="chart-wrap chart-wrap-trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b6b6b', fontSize: 10 }}
            axisLine={{ stroke: '#333' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b6b6b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
          />
          <Tooltip
            contentStyle={{
              background: '#111',
              border: '1px solid #333',
              fontFamily: 'JetBrains Mono',
              fontSize: 11,
            }}
            formatter={(value, _name, item) => {
              const point = item.payload as TrendPoint & { label: string }
              const delta =
                point.delta != null
                  ? ` · ${point.delta > 0 ? '+' : ''}${point.delta.toFixed(0)}`
                  : ''
              return [`${formatChf(Number(value))}${delta}`, 'spent']
            }}
            labelFormatter={(_l, payload) => {
              const p = payload?.[0]?.payload as TrendPoint | undefined
              return p ? monthLabel(p.month) : ''
            }}
          />
          <ReferenceLine y={avg} stroke="#333" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#3dd68c"
            strokeWidth={2.5}
            dot={{ fill: '#3dd68c', stroke: '#000', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#3dd68c', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
