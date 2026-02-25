import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{d.name}</p>
        <p style={{ color: '#10B981' }}>
          Auth Rate: <strong>{d['Auth Rate %']}%</strong>
        </p>
        <p style={{ color: '#EF4444' }}>
          Decline Rate: <strong>{d['Decline Rate %']}%</strong>
        </p>
        <p>
          Transactions: <strong>{d.total}</strong>
        </p>
        <p>
          Revenue at Risk:{' '}
          <strong>
            ${d.risk
              ? d.risk.toLocaleString('en-US', { minimumFractionDigits: 2 })
              : '0.00'}
          </strong>
        </p>
      </div>
    )
  }
  return null
}

export default function PaymentMethodChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No payment method data</div>
  }

  const formatted = data.map((d, i) => ({
    name: d.payment_method
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()),
    'Auth Rate %': d.auth_rate,
    'Decline Rate %': d.decline_rate,
    total: d.total,
    soft: d.soft_declines,
    risk: d.revenue_at_risk,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} />
        <YAxis
          tick={{ fill: '#94A3B8', fontSize: 12 }}
          domain={[0, 100]}
          tickFormatter={v => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
        <Bar dataKey="Auth Rate %" radius={[4, 4, 0, 0]}>
          {formatted.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
