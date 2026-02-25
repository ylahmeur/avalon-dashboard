import React from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{d.date}</p>
        <p>
          Total: <strong>{d.total}</strong>
        </p>
        <p style={{ color: '#10B981' }}>
          Approved: <strong>{d.approved}</strong>
        </p>
        <p style={{ color: '#EF4444' }}>
          Declined: <strong>{d.declined}</strong>
        </p>
        <p style={{ color: '#3B82F6' }}>
          Auth Rate: <strong>{d.auth_rate}%</strong>
        </p>
        <p style={{ color: '#F59E0B' }}>
          Revenue at Risk:{' '}
          <strong>
            ${d.revenue_at_risk
              ? d.revenue_at_risk.toLocaleString('en-US', { minimumFractionDigits: 2 })
              : '0.00'}
          </strong>
        </p>
      </div>
    )
  }
  return null
}

export default function TimelineChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No timeline data</div>
  }

  const formatted = data.map(d => ({
    ...d,
    dateLabel: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  const tickInterval = Math.max(1, Math.floor(formatted.length / 8))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={formatted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="dateLabel"
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          interval={tickInterval}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: '#94A3B8', fontSize: 12 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: '#3B82F6', fontSize: 12 }}
          domain={[0, 100]}
          tickFormatter={v => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
        <Bar
          yAxisId="left"
          dataKey="approved"
          fill="#10B981"
          opacity={0.7}
          name="Approved"
          radius={[2, 2, 0, 0]}
        />
        <Bar
          yAxisId="left"
          dataKey="declined"
          fill="#EF4444"
          opacity={0.7}
          name="Declined"
          radius={[2, 2, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="auth_rate"
          stroke="#3B82F6"
          strokeWidth={2.5}
          dot={false}
          name="Auth Rate %"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
