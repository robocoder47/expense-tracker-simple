import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatChfShort, monthLabelShort } from '../lib/calculations'

const COLORS = ['#3dd68c', '#5b9bd5', '#e8a838', '#c77dff', '#ff6b6b', '#4ecdc4']

interface MonthlyMiniPieProps {
  month: string
  data: { name: string; value: number }[]
  total: number
  active?: boolean
  onClick?: () => void
}

export function MonthlyMiniPie({ month, data, total, active, onClick }: MonthlyMiniPieProps) {
  const top = data.slice(0, 4)
  const rest = data.slice(4).reduce((s, d) => s + d.value, 0)
  const chartData = rest > 0 ? [...top, { name: '…', value: rest }] : top

  return (
    <button
      type="button"
      className={`mini-pie-card ${active ? 'mini-pie-card-active' : ''}`}
      onClick={onClick}
    >
      <div className="mini-pie-label">{monthLabelShort(month)}</div>
      <div className="mini-pie-chart">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={18}
                outerRadius={32}
                stroke="#000"
                strokeWidth={1}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#111',
                  border: '1px solid #333',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono',
                }}
                formatter={(v) => formatChfShort(Number(v))}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="mini-pie-empty">—</div>
        )}
      </div>
      <div className="mini-pie-total amount">{formatChfShort(total)}</div>
    </button>
  )
}
