# Avalon Market — Payment Intelligence Dashboard

A full-stack payment decline intelligence dashboard providing real-time analytics on authorization rates, decline reasons, processor performance, and revenue recovery opportunities across Avalon Market's Latin American operations (Brazil, Mexico, Colombia).

---

## Overview

This dashboard enables the payments operations team to:
- Monitor authorization rates and identify declines in real time
- Classify declines as **soft** (retriable) vs **hard** (permanent) to prioritize recovery efforts
- Compare processor performance and identify underperforming routing paths
- Analyze payment method and geographic breakdowns
- Quantify **revenue at risk** from soft declines that could be retried

---

## Prerequisites

- **Python** 3.9 or higher
- **Node.js** 18 or higher
- **pip** (Python package manager)
- **npm** (Node package manager)

---

## Quick Start

### 1. Generate test data

```bash
cd /Users/yaminlahmeur/avalon-dashboard/backend
python data_generator.py
```

This creates `backend/transactions.json` with 1,000 synthetic transactions embedding realistic patterns.

### 2. Install and start the backend

```bash
cd /Users/yaminlahmeur/avalon-dashboard/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at: `http://localhost:8000`
Interactive docs: `http://localhost:8000/docs`

### 3. Install and start the frontend

Open a second terminal:

```bash
cd /Users/yaminlahmeur/avalon-dashboard/frontend
npm install
npm run dev
```

The dashboard will be available at: `http://localhost:3000`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check — confirms transactions loaded |
| `GET` | `/api/analytics` | Full analytics payload (filterable) |
| `GET` | `/api/transactions` | Paginated raw transaction list |
| `GET` | `/api/filters` | Available filter options and date range |

### Query Parameters for `/api/analytics`

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `country` | string | `BR` | Filter by country code (BR, MX, CO) |
| `payment_method` | string | `pix` | Filter by payment method |
| `processor` | string | `processor_b` | Filter by processor |
| `date_from` | string (ISO) | `2025-01-01T00:00:00` | Start of date range |
| `date_to` | string (ISO) | `2025-01-31T23:59:59` | End of date range |

### Query Parameters for `/api/transactions`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 100 | Records per page (max 1000) |
| `offset` | int | 0 | Pagination offset |
| `country` | string | — | Filter by country |
| `payment_method` | string | — | Filter by payment method |
| `processor` | string | — | Filter by processor |
| `status` | string | — | Filter by status (approved/declined/error) |

---

## Regenerating Test Data

```bash
cd /Users/yaminlahmeur/avalon-dashboard/backend
python data_generator.py
```

Restart the backend server after regenerating data (transactions are loaded at startup).

To change the number of transactions, edit `N_TRANSACTIONS = 1000` in `data_generator.py`.

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Backend API | FastAPI | 0.109.0 |
| ASGI Server | Uvicorn | 0.27.0 |
| Data Analysis | Pandas | 2.1.4 |
| Frontend Framework | React | 18.2.0 |
| Build Tool | Vite | 5.0.12 |
| Charts | Recharts | 2.10.3 |
| HTTP Client | Axios | 1.6.5 |

---

## Project Structure

```
avalon-dashboard/
├── backend/
│   ├── main.py              # FastAPI application and routes
│   ├── analytics.py         # Pure analytics computation functions
│   ├── data_generator.py    # Synthetic data generator script
│   ├── requirements.txt     # Python dependencies
│   └── transactions.json    # Generated transaction data (git-ignored)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main application component
│   │   ├── App.css          # Global dark-theme styles
│   │   ├── main.jsx         # React entry point
│   │   └── components/
│   │       ├── MetricsCards.jsx       # KPI summary cards
│   │       ├── DeclineReasonsChart.jsx # Bar chart of decline reasons
│   │       ├── ProcessorChart.jsx     # Processor performance comparison
│   │       ├── PaymentMethodChart.jsx # Auth rate by payment method
│   │       ├── TimelineChart.jsx      # 30-day timeline (composed chart)
│   │       ├── FilterPanel.jsx        # Global filter controls
│   │       └── CountryChart.jsx       # Geographic pie chart
│   ├── index.html
│   ├── package.json
│   └── vite.config.js       # Vite config with API proxy
├── README.md
├── ARCHITECTURE.md
└── EXECUTIVE_SUMMARY.md
```

---

## Embedded Data Patterns

The synthetic data generator embeds six deliberate patterns for analysis and testing:

1. **Processor C + PIX**: 2x higher soft decline rate
2. **Brazil + Weekends**: 30% higher decline rate on Saturdays and Sundays
3. **Processor B**: Elevated overall decline rate (~25% vs ~14% for others)
4. **Processor D**: Handles mostly Colombia with better performance (~12% decline)
5. **2am–5am UTC**: `issuer_unavailable` spikes due to simulated bank downtime
6. **OXXO**: Higher `processing_error` rate reflecting cash payment complexity
