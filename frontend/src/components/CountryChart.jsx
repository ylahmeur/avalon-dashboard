import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const COUNTRY_NAMES = { BR: 'Brazil', MX: 'Mexico', CO: 'Colombia' }
const COLORS = ['#3B82F6', '#10B981', '#F59E0B']

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{d.name}</p>
        <p>
          Transactions: <strong>{d.value}</strong>
        </p>
        <p style={{ color: '#10B981' }}>
          Auth Rate: <strong>{d.auth_rate}%</strong>
        </p>
        <p style={{ color: '#EF4444' }}>
          Decline Rate: <strong>{d.decline_rate}%</strong>
        </p>
        <p>
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

const CustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  auth_rate,
}) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight="600"
    >
      {auth_rate}%
    </text>
  )
}

export default function CountryChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No country data</div>
  }

  const formatted = data.map((d, i) => ({
    name: COUNTRY_NAMES[d.country] || d.country,
    value: d.total,
    auth_rate: d.auth_rate,
    decline_rate: d.decline_rate,
    revenue_at_risk: d.revenue_at_risk,
    soft: d.soft_declines,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          outerRadius={110}
          dataKey="value"
          labelLine={false}
          label={CustomLabel}
        >
          {formatted.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={value => (
            <span style={{ color: '#94A3B8', fontSize: 12 }}>{value}</span>
          )}
          payload={formatted.map(d => ({
            value: `${d.name} (${d.value} txns)`,
            color: d.color,
            type: 'circle',
          }))}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
