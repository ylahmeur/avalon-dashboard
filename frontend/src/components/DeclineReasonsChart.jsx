import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const SOFT_COLOR = '#F59E0B'
const HARD_COLOR = '#EF4444'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-type" style={{ color: d.fill }}>
          Type: {d.type ? d.type.toUpperCase() + ' DECLINE' : 'UNKNOWN'}
        </p>
        <p>
          Count: <strong>{d.count}</strong>
        </p>
        <p>
          Share: <strong>{d.percentage}%</strong>
        </p>
        <p>
          Revenue Impact:{' '}
          <strong>
            ${d.revenue_impact
              ? d.revenue_impact.toLocaleString('en-US', { minimumFractionDigits: 2 })
              : '0.00'}
          </strong>
        </p>
      </div>
    )
  }
  return null
}

export default function DeclineReasonsChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No decline data</div>
  }

  const formatted = data.map(d => ({
    ...d,
    name: d.reason
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()),
    fill: d.type === 'soft' ? SOFT_COLOR : HARD_COLOR,
  }))

  return (
    <div className="chart-wrapper">
      <div className="chart-legend-custom">
        <span className="legend-dot" style={{ background: SOFT_COLOR }} />
        Soft (retriable)
        <span className="legend-dot" style={{ background: HARD_COLOR }} />
        Hard (permanent)
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={formatted}
          margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {formatted.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
