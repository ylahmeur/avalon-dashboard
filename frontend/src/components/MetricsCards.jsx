import React from 'react'

function MetricCard({ title, value, subtitle, variant = 'default', icon }) {
  return (
    <div className={`metric-card metric-card--${variant}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-content">
        <p className="metric-title">{title}</p>
        <p className="metric-value">{value}</p>
        {subtitle && <p className="metric-subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function MetricsCards({ summary }) {
  if (!summary) return null

  const authRateVariant =
    summary.auth_rate >= 85 ? 'success' : summary.auth_rate >= 75 ? 'warning' : 'danger'

  return (
    <div className="metrics-grid">
      <MetricCard
        title="Authorization Rate"
        value={`${summary.auth_rate}%`}
        subtitle={`${summary.approved.toLocaleString()} of ${summary.total_transactions.toLocaleString()} approved`}
        variant={authRateVariant}
        icon="✓"
      />
      <MetricCard
        title="Revenue at Risk"
        value={`$${summary.revenue_at_risk.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
        subtitle={`From ${summary.recoverable_transactions} retriable soft declines`}
        variant="danger"
        icon="⚠"
      />
      <MetricCard
        title="Soft Declines"
        value={summary.soft_declines.toLocaleString()}
        subtitle="Potentially recoverable transactions"
        variant="warning"
        icon="↻"
      />
      <MetricCard
        title="Hard Declines"
        value={summary.hard_declines.toLocaleString()}
        subtitle="Permanent failures — no retry benefit"
        variant="neutral"
        icon="✕"
      />
      <MetricCard
        title="Total Volume"
        value={`$${summary.total_volume.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
        subtitle={`$${summary.approved_volume.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })} captured`}
        variant="default"
        icon="$"
      />
      <MetricCard
        title="Errors / Timeouts"
        value={summary.errors.toLocaleString()}
        subtitle={`${((summary.errors / summary.total_transactions) * 100).toFixed(1)}% of transactions`}
        variant="neutral"
        icon="!"
      />
    </div>
  )
}
