# Architecture Document — Avalon Market Payment Intelligence Dashboard

## Overview

This document describes the technical architecture, design decisions, and trade-offs for the Avalon Market Payment Intelligence Dashboard.

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Backend framework | **FastAPI** | Async-first, automatic OpenAPI docs, Pydantic validation, excellent performance for analytics APIs |
| Data processing | **Pandas** | Industry standard for tabular analytics; groupby/filter operations on 1,000–100,000 rows are fast in-memory |
| ASGI server | **Uvicorn** | Lightweight, production-grade ASGI server optimized for FastAPI |
| Frontend framework | **React 18** | Component model maps cleanly to dashboard widgets; large ecosystem |
| Build tool | **Vite** | Sub-second HMR, ES module native, significantly faster than CRA/webpack for development |
| Charts | **Recharts** | React-native SVG charts with composable API; Recharts is more idiomatic for React than Chart.js or D3 direct |
| HTTP client | **Axios** | Cleaner API than fetch for query parameter serialization; interceptors for error handling |

---

## Backend Structure

### `main.py` — FastAPI Application

The entry point defines three REST endpoints:

- **`GET /api/analytics`** — The primary endpoint. Accepts filter query parameters, clones the in-memory DataFrame, applies filters, and delegates to `compute_analytics()`. Returns the full analytics payload as JSON.
- **`GET /api/transactions`** — Paginated raw transaction list for debugging and drill-down.
- **`GET /api/filters`** — Returns available filter options (distinct countries, processors, payment methods) and the actual date range in the dataset. Consumed by the frontend to populate filter dropdowns.

**Data loading strategy**: The DataFrame is loaded once at startup via `load_data()` and stored as the module-level `DF`. Each request receives a copy (`DF.copy()`) before filtering to preserve thread safety and avoid mutations. For 1,000 transactions, in-memory pandas is appropriate; at 1M+ rows, this would be replaced by a database query layer.

**CORS**: Wildcard `allow_origins=["*"]` is used for local development. In production, this should be restricted to the specific frontend origin.

### `analytics.py` — Pure Analysis Functions

Intentionally **decoupled from FastAPI** with zero HTTP dependencies. This design enables:
- Unit testing without spinning up a web server
- Reuse in batch jobs, notebooks, or CLI scripts
- Clear separation of concerns

**`SOFT_DECLINE_REASONS`** and **`HARD_DECLINE_REASONS`** are Python `set` objects for O(1) membership testing.

**`classify_decline(reason)`** maps a decline reason string to `"soft"` or `"hard"`. Returns `None` for unknown reasons.

**`compute_analytics(df, filters)`** accepts a pandas DataFrame and an optional filter dict. It:
1. Applies filters in-place on the copy
2. Computes summary KPIs
3. Computes per-processor, per-method, per-country, and per-reason breakdowns using explicit loops (rather than groupby chains) for readability and to support custom logic per dimension
4. Builds a daily timeline by adding a derived `date` string column
5. Returns a single nested dictionary that maps 1:1 to the frontend's data model

### `data_generator.py` — Synthetic Data Generator

A standalone script (not imported by the server) that creates 1,000 realistic transactions. Key design choices:

- **Seeded randomness** (`random.seed(42)`) for reproducibility
- **Country-driven payment method selection** enforces geographic product availability (PIX is Brazil only, OXXO is Mexico only, PSE is Colombia only)
- **Processor-country affinity**: Processor D routes mostly Colombia, reflecting a real-world scenario where a processor may specialize in a single market
- **Pattern injection** via conditional probability weights rather than post-hoc mutation, keeping the generation logic clean and extensible

---

## Decline Classification Logic

Declines are classified into two categories that drive recovery strategy:

### Soft Declines (Retriable)
```
SOFT_DECLINE_REASONS = {
    "insufficient_funds",   # Customer may have funds later
    "do_not_honor",         # Generic issuer decline, often transient
    "issuer_unavailable",   # Issuer system is temporarily down
    "processing_error",     # Technical error, retry is appropriate
    "exceeded_limits",      # Velocity limit, may clear with time
}
```
Soft declines represent **revenue recovery opportunities**. The recommended action is to retry with the same processor (same-day for `issuer_unavailable`, next billing cycle for `insufficient_funds`) or route to an alternative processor.

### Hard Declines (Permanent)
```
HARD_DECLINE_REASONS = {
    "stolen_card",           # Fraud — do not retry
    "invalid_card_number",   # Data entry error — fix data
    "card_not_supported",    # Card type not accepted by processor
    "expired_card",          # Customer must update payment method
    "restricted_card",       # Bank-level restriction — do not retry
}
```
Hard declines require **customer action** and should not be retried automatically, as repeated attempts may trigger fraud flags or increase processing costs.

---

## Frontend Structure

### Component Hierarchy

```
App
├── FilterPanel          (filter controls, talks to App state)
├── MetricsCards         (summary KPI row)
├── charts-grid (2-col)
│   ├── DeclineReasonsChart   (horizontal bar, colored by soft/hard)
│   ├── ProcessorChart        (grouped bar: auth rate vs decline rate)
│   ├── PaymentMethodChart    (bar per method, colored by method)
│   └── CountryChart          (pie chart with inline auth rate labels)
├── TimelineChart             (composed chart: bar + line, full width)
└── insights-grid             (3 static insight cards from analytics)
```

### State Management

App.jsx holds all state with React's built-in `useState` and `useEffect`. No external state management (Redux, Zustand) is needed because:
- State is simple: one analytics payload, one filters object, one filter-options object
- All components receive data via props (no prop drilling problem at this depth)
- Filter changes trigger a single API call, not cascading updates

### Data Flow

```
User changes filter
    → handleFilterChange() updates filters state
    → useEffect([filters]) fires
    → axios.get('/api/analytics', { params: filters })
    → setAnalytics(response.data)
    → React re-renders all chart components with new data
```

### Vite Proxy

`vite.config.js` proxies `/api/*` to `http://localhost:8000` in development. This eliminates CORS issues during development and means the frontend code never hard-codes `localhost:8000` — production deployments only need to update the proxy target or point to the production API URL.

---

## Key Design Decisions

1. **In-memory data store**: Loading `transactions.json` into a pandas DataFrame at startup keeps the stack simple. A SQLite or PostgreSQL backend would be the natural next step for datasets > 100k rows or multi-user concurrent access.

2. **Single analytics endpoint vs per-chart endpoints**: A single `/api/analytics` call returns all breakdowns. This reduces round trips, simplifies filter application (apply once, compute all views), and keeps the frontend loading state simple.

3. **Pure function analytics**: `compute_analytics` is a pure function with no side effects. This makes it trivial to test, benchmark, and run in a Jupyter notebook for ad-hoc analysis.

4. **No authentication**: The dashboard is designed for internal operations teams. In production, this would be protected by OAuth2/JWT or an API gateway.

5. **USD normalization**: All amounts are stored in USD to simplify cross-country revenue comparisons. In a production system, the original currency and exchange rate at transaction time would both be stored.

---

## Trade-offs

| Decision | Benefit | Trade-off |
|----------|---------|-----------|
| Pandas in-memory | Zero DB setup, fast for 1K–100K rows | Not scalable to millions of rows; no persistence |
| Single analytics endpoint | One fetch per filter change, simple state | Over-fetches if only one chart needs updating |
| No caching | Simple code | Same computation repeated on every filter change |
| JSON file as data source | No DB dependency | Requires server restart to pick up regenerated data |
| Recharts over D3 | Faster to build React charts | Less customizable for very complex visualizations |
