import React from 'react'

export default function FilterPanel({ options, filters, onChange, onClear }) {
  const hasActive = Object.values(filters).some(v => v)

  return (
    <div className="filter-panel">
      <div className="filter-row">
        <span className="filter-label">Filter by:</span>

        <select
          className="filter-select"
          value={filters.country || ''}
          onChange={e => onChange('country', e.target.value)}
        >
          <option value="">All Countries</option>
          {(options.countries || []).map(c => (
            <option key={c} value={c}>
              {c === 'BR' ? '🇧🇷 Brazil' : c === 'MX' ? '🇲🇽 Mexico' : '🇨🇴 Colombia'}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filters.payment_method || ''}
          onChange={e => onChange('payment_method', e.target.value)}
        >
          <option value="">All Payment Methods</option>
          {(options.payment_methods || []).map(m => (
            <option key={m} value={m}>
              {m.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filters.processor || ''}
          onChange={e => onChange('processor', e.target.value)}
        >
          <option value="">All Processors</option>
          {(options.processors || []).map(p => (
            <option key={p} value={p}>
              {p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>

        {hasActive && (
          <button className="btn-clear" onClick={onClear}>
            Clear Filters x
          </button>
        )}
      </div>
    </div>
  )
}
