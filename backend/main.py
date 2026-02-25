from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pandas as pd
import json
import os
from analytics import compute_analytics, SOFT_DECLINE_REASONS, HARD_DECLINE_REASONS, classify_decline
from typing import Optional

app = FastAPI(title="Avalon Market Payment Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load transactions at startup
DATA_PATH = os.path.join(os.path.dirname(__file__), "transactions.json")


def load_data():
    with open(DATA_PATH) as f:
        records = json.load(f)
    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    # Classify decline type
    df["decline_type"] = df["decline_reason"].apply(lambda r: classify_decline(r) if r else None)
    return df


DF = load_data()


@app.get("/api/analytics")
def get_analytics(
    country: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    processor: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    filters = {
        "country":        country,
        "payment_method": payment_method,
        "processor":      processor,
        "date_from":      date_from,
        "date_to":        date_to,
    }
    result = compute_analytics(DF.copy(), filters)
    return result


@app.get("/api/transactions")
def get_transactions(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    country: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    processor: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    df = DF.copy()
    if country:
        df = df[df["country"] == country]
    if payment_method:
        df = df[df["payment_method"] == payment_method]
    if processor:
        df = df[df["processor"] == processor]
    if status:
        df = df[df["status"] == status]

    df = df.sort_values("timestamp", ascending=False)
    total = len(df)
    page  = df.iloc[offset : offset + limit].copy()
    page["timestamp"] = page["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "total":  total,
        "offset": offset,
        "limit":  limit,
        "data":   page.to_dict(orient="records"),
    }


@app.get("/api/filters")
def get_filters():
    return {
        "countries":       sorted(DF["country"].unique().tolist()),
        "payment_methods": sorted(DF["payment_method"].unique().tolist()),
        "processors":      sorted(DF["processor"].unique().tolist()),
        "statuses":        sorted(DF["status"].unique().tolist()),
        "date_range": {
            "min": DF["timestamp"].min().isoformat(),
            "max": DF["timestamp"].max().isoformat(),
        },
    }


@app.get("/health")
def health():
    return {"status": "ok", "transactions_loaded": len(DF)}


# ── Serve React frontend (production build) ───────────────────────────────────
DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")

if os.path.exists(DIST):
    assets_dir = os.path.join(DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str = ""):
        file_path = os.path.join(DIST, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST, "index.html"))
