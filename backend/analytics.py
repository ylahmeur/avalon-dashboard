# analytics.py - Pure analysis functions, no FastAPI

SOFT_DECLINE_REASONS = {
    "insufficient_funds", "do_not_honor", "issuer_unavailable",
    "processing_error", "exceeded_limits"
}

HARD_DECLINE_REASONS = {
    "stolen_card", "invalid_card_number", "card_not_supported",
    "expired_card", "restricted_card"
}


def classify_decline(reason):
    if reason in SOFT_DECLINE_REASONS:
        return "soft"
    elif reason in HARD_DECLINE_REASONS:
        return "hard"
    return None


def _norm(value: str) -> str:
    """Normalize filter values: lowercase + spaces → underscores.
    Handles e.g. 'PIX' → 'pix', 'Processor B' → 'processor_b'.
    """
    return value.strip().lower().replace(" ", "_")


def compute_analytics(df, filters=None):
    """
    df: pandas DataFrame of transactions
    filters: dict with optional keys: country, payment_method, processor, date_from, date_to
    Returns: dict with all analytics
    """
    # Apply filters
    if filters:
        if filters.get("country"):
            df = df[df["country"] == filters["country"].strip().upper()]
        if filters.get("payment_method"):
            df = df[df["payment_method"] == _norm(filters["payment_method"])]
        if filters.get("processor"):
            df = df[df["processor"] == _norm(filters["processor"])]
        if filters.get("date_from"):
            df = df[df["timestamp"] >= filters["date_from"]]
        if filters.get("date_to"):
            df = df[df["timestamp"] <= filters["date_to"]]

    total = len(df)
    if total == 0:
        return {"error": "No transactions match filters"}

    approved = df[df["status"] == "approved"]
    declined = df[df["status"] == "declined"]
    errors   = df[df["status"] == "error"]

    soft_declines = declined[declined["decline_type"] == "soft"]
    hard_declines = declined[declined["decline_type"] == "hard"]

    # Key metrics
    auth_rate        = round(len(approved) / total * 100, 2)
    revenue_at_risk  = round(soft_declines["amount"].sum(), 2)
    recoverable_count = len(soft_declines)

    # ── By processor ─────────────────────────────────────────────────────────
    processor_stats = []
    for proc in df["processor"].unique():
        proc_df      = df[df["processor"] == proc]
        proc_approved = proc_df[proc_df["status"] == "approved"]
        proc_declined = proc_df[proc_df["status"] == "declined"]
        proc_soft     = proc_df[proc_df["decline_type"] == "soft"]
        proc_hard     = proc_df[proc_df["decline_type"] == "hard"]
        n = len(proc_df)
        processor_stats.append({
            "processor":       proc,
            "total":           n,
            "approved":        len(proc_approved),
            "declined":        len(proc_declined),
            "auth_rate":       round(len(proc_approved) / n * 100, 2) if n > 0 else 0,
            "soft_declines":   len(proc_soft),
            "hard_declines":   len(proc_hard),
            "revenue_at_risk": round(proc_soft["amount"].sum(), 2),
            "decline_rate":    round(len(proc_declined) / n * 100, 2) if n > 0 else 0,
        })

    # ── By payment method ─────────────────────────────────────────────────────
    method_stats = []
    for method in df["payment_method"].unique():
        m_df      = df[df["payment_method"] == method]
        m_approved = m_df[m_df["status"] == "approved"]
        m_declined = m_df[m_df["status"] == "declined"]
        m_soft     = m_df[m_df["decline_type"] == "soft"]
        n = len(m_df)
        method_stats.append({
            "payment_method":  method,
            "total":           n,
            "approved":        len(m_approved),
            "declined":        len(m_declined),
            "auth_rate":       round(len(m_approved) / n * 100, 2) if n > 0 else 0,
            "soft_declines":   len(m_soft),
            "revenue_at_risk": round(m_soft["amount"].sum(), 2),
            "decline_rate":    round(len(m_declined) / n * 100, 2) if n > 0 else 0,
        })

    # ── By country ───────────────────────────────────────────────────────────
    country_stats = []
    for country in df["country"].unique():
        c_df      = df[df["country"] == country]
        c_approved = c_df[c_df["status"] == "approved"]
        c_declined = c_df[c_df["status"] == "declined"]
        c_soft     = c_df[c_df["decline_type"] == "soft"]
        n = len(c_df)
        country_stats.append({
            "country":         country,
            "total":           n,
            "approved":        len(c_approved),
            "declined":        len(c_declined),
            "auth_rate":       round(len(c_approved) / n * 100, 2) if n > 0 else 0,
            "soft_declines":   len(c_soft),
            "revenue_at_risk": round(c_soft["amount"].sum(), 2),
            "decline_rate":    round(len(c_declined) / n * 100, 2) if n > 0 else 0,
        })

    # ── By decline reason ─────────────────────────────────────────────────────
    declined_df  = df[df["status"] == "declined"]
    reason_stats = []
    for reason in declined_df["decline_reason"].dropna().unique():
        r_df = declined_df[declined_df["decline_reason"] == reason]
        reason_stats.append({
            "reason":         reason,
            "count":          len(r_df),
            "type":           classify_decline(reason),
            "revenue_impact": round(r_df["amount"].sum(), 2),
            "percentage":     round(len(r_df) / len(declined_df) * 100, 2) if len(declined_df) > 0 else 0,
        })
    reason_stats.sort(key=lambda x: x["count"], reverse=True)

    # ── Daily timeline ────────────────────────────────────────────────────────
    df_copy = df.copy()
    df_copy["date"] = df_copy["timestamp"].dt.date.astype(str)
    timeline = []
    for date in sorted(df_copy["date"].unique()):
        d_df      = df_copy[df_copy["date"] == date]
        d_approved = d_df[d_df["status"] == "approved"]
        d_declined = d_df[d_df["status"] == "declined"]
        d_soft     = d_df[d_df["decline_type"] == "soft"]
        n = len(d_df)
        timeline.append({
            "date":            date,
            "total":           n,
            "approved":        len(d_approved),
            "declined":        len(d_declined),
            "auth_rate":       round(len(d_approved) / n * 100, 2) if n > 0 else 0,
            "revenue_at_risk": round(d_soft["amount"].sum(), 2),
        })

    return {
        "summary": {
            "total_transactions":    total,
            "approved":              len(approved),
            "declined":              len(declined),
            "errors":                len(errors),
            "auth_rate":             auth_rate,
            "revenue_at_risk":       revenue_at_risk,
            "recoverable_transactions": recoverable_count,
            "soft_declines":         len(soft_declines),
            "hard_declines":         len(hard_declines),
            "total_volume":          round(df["amount"].sum(), 2),
            "approved_volume":       round(approved["amount"].sum(), 2),
        },
        "by_processor":      sorted(processor_stats, key=lambda x: x["decline_rate"], reverse=True),
        "by_payment_method": sorted(method_stats,    key=lambda x: x["decline_rate"], reverse=True),
        "by_country":        sorted(country_stats,   key=lambda x: x["decline_rate"], reverse=True),
        "by_decline_reason": reason_stats,
        "timeline":          timeline,
    }
