import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import MetricsCards from './components/MetricsCards'
import FilterPanel from './components/FilterPanel'
import DeclineReasonsChart from './components/DeclineReasonsChart'
import ProcessorChart from './components/ProcessorChart'
import PaymentMethodChart from './components/PaymentMethodChart'
import TimelineChart from './components/TimelineChart'
import CountryChart from './components/CountryChart'

const API_BASE = '/api'

export default function App() {
  const [analytics, setAnalytics] = useState(null)
  const [filters, setFilters] = useState({})
  const [filterOptions, setFilterOptions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load filter options once
  useEffect(() => {
    axios
      .get(`${API_BASE}/filters`)
      .then(r => setFilterOptions(r.data))
      .catch(console.error)
  }, [])

  // Load analytics whenever filters change
  useEffect(() => {
    setLoading(true)
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v)
    )
    axios
      .get(`${API_BASE}/analytics`, { params })
      .then(r => {
        setAnalytics(r.data)
        setError(null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [filters])

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
  }, [])

  const clearFilters = useCallback(() => setFilters({}), [])

  const hasActiveFilters = Object.values(filters).some(v => v)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">AM</div>
          <div>
            <h1>Payment Intelligence Dashboard</h1>
            <p className="subtitle">Avalon Market — Powered by Yuno Orchestration</p>
          </div>
        </div>
        <div className="header-right">
          {hasActiveFilters && (
            <span className="filter-badge">Filters Active</span>
          )}
          <span className="last-updated">Last 30 days</span>
        </div>
      </header>

      <main className="app-main">
        <FilterPanel
          options={filterOptions}
          filters={filters}
          onChange={handleFilterChange}
          onClear={clearFilters}
        />

        {error && (
          <div className="error-banner">Error loading data: {error}</div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Analyzing payment data...</p>
          </div>
        ) : analytics && !analytics.error ? (
          <>
            <MetricsCards summary={analytics.summary} />

            <div className="charts-grid">
              <div className="chart-card">
                <h3 className="chart-title">Decline Reasons Distribution</h3>
                <p className="chart-subtitle">What's causing payment failures?</p>
                <DeclineReasonsChart data={analytics.by_decline_reason} />
              </div>

              <div className="chart-card">
                <h3 className="chart-title">Processor Performance</h3>
                <p className="chart-subtitle">Decline rate by payment processor</p>
                <ProcessorChart data={analytics.by_processor} />
              </div>

              <div className="chart-card">
                <h3 className="chart-title">Payment Method Analysis</h3>
                <p className="chart-subtitle">Authorization rate by payment method</p>
                <PaymentMethodChart data={analytics.by_payment_method} />
              </div>

              <div className="chart-card">
                <h3 className="chart-title">Geographic Breakdown</h3>
                <p className="chart-subtitle">Performance by country</p>
                <CountryChart data={analytics.by_country} />
              </div>
            </div>

            <div className="chart-card chart-card--full">
              <h3 className="chart-title">Daily Decline Trends</h3>
              <p className="chart-subtitle">Authorization rate and revenue at risk over time</p>
              <TimelineChart data={analytics.timeline} />
            </div>

            <div className="insights-section">
              <h3 className="section-title">Key Insights</h3>
              <div className="insights-grid">
                <div className="insight-card insight-card--warning">
                  <h4>Revenue Recovery Opportunity</h4>
                  <p>
                    <strong>
                      ${analytics.summary.revenue_at_risk.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>{' '}
                    is at risk from{' '}
                    <strong>{analytics.summary.recoverable_transactions}</strong> soft
                    declines that could be retried.
                  </p>
                </div>

                <div className="insight-card insight-card--danger">
                  <h4>Worst Performing Processor</h4>
                  {analytics.by_processor[0] && (
                    <p>
                      <strong>
                        {analytics.by_processor[0].processor
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, l => l.toUpperCase())}
                      </strong>{' '}
                      has the highest decline rate at{' '}
                      <strong>{analytics.by_processor[0].decline_rate}%</strong> (
                      {analytics.by_processor[0].declined} failed transactions).
                    </p>
                  )}
                </div>

                <div className="insight-card insight-card--info">
                  <h4>Top Decline Reason</h4>
                  {analytics.by_decline_reason[0] && (
                    <p>
                      <strong>
                        {analytics.by_decline_reason[0].reason.replace(/_/g, ' ')}
                      </strong>{' '}
                      accounts for{' '}
                      <strong>{analytics.by_decline_reason[0].percentage}%</strong> of
                      all declines — this is a{' '}
                      <strong>{analytics.by_decline_reason[0].type} decline</strong>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : analytics && analytics.error ? (
          <div className="error-banner">{analytics.error}</div>
        ) : null}
      </main>
    </div>
  )
}
