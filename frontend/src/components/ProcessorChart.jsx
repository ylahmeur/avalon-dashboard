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
} from 'recharts'

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
          Total: <strong>{d.total}</strong>
        </p>
        <p>
          Soft Declines: <strong>{d.soft}</strong>
        </p>
        <p>
          Hard Declines: <strong>{d.hard}</strong>
        </p>
        <p>
          Revenue at Risk:{' '}
          <strong>
            ${d['Revenue at Risk']
              ? d['Revenue at Risk'].toLocaleString('en-US', { minimumFractionDigits: 2 })
              : '0.00'}
          </strong>
        </p>
      </div>
    )
  }
  return null
}

export default function ProcessorChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No processor data</div>
  }

  const formatted = data
    .map(d => ({
      name: d.processor.replace('processor_', 'Proc ').toUpperCase(),
      'Auth Rate %': d.auth_rate,
      'Decline Rate %': d.decline_rate,
      'Revenue at Risk': d.revenue_at_risk,
      total: d.total,
      soft: d.soft_declines,
      hard: d.hard_declines,
    }))
    .sort((a, b) => b['Decline Rate %'] - a['Decline Rate %'])

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
        <Bar dataKey="Auth Rate %" fill="#10B981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Decline Rate %" fill="#EF4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
