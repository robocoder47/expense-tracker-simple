import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatChf, formatChfShort } from '../lib/calculations'

const CHART_COLORS = [
  '#3dd68c',
  '#5b9bd5',
  '#e8a838',
  '#c77dff',
  '#ff6b6b',
  '#4ecdc4',
  '#f4a261',
  '#a8dadc',
  '#e76f51',
  '#2a9d8f',
]

interface CategoryChartProps {
  data: { name: string; value: number }[]
  centerTotal?: number
}

export function CategoryChart({ data, centerTotal }: CategoryChartProps) {
  if (data.length === 0) {
    return <p className="empty">no data for chart</p>
  }

  const total = centerTotal ?? data.reduce((s, d) => s + d.value, 0)
  const top = data.slice(0, 8)
  const rest = data.slice(8)
  const chartData =
    rest.length > 0
      ? [...top, { name: 'other', value: rest.reduce((s, d) => s + d.value, 0) }]
      : top

  return (
    <div className="donut-chart-block">
      <div className="chart-wrap chart-wrap-donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              stroke="#000"
              strokeWidth={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#111',
                border: '1px solid #333',
                fontFamily: 'JetBrains Mono',
                fontSize: 11,
              }}
              formatter={(value, name) => [formatChf(Number(value)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center" aria-hidden>
          <div className="donut-center-label">total</div>
          <div className="donut-center-value amount">{formatChfShort(total)}</div>
        </div>
      </div>
      <ul className="category-legend">
        {data.slice(0, 6).map((d, i) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : '0'
          return (
            <li key={d.name} className="category-legend-item">
              <span
                className="category-legend-dot"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="category-legend-name">{d.name}</span>
              <span className="category-legend-pct amount">{pct}%</span>
              <span className="category-legend-val amount">{formatChf(d.value)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
