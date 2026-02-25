"""
data_generator.py
Generates 1000 realistic synthetic payment transactions for Avalon Market.
Run: python data_generator.py
Output: transactions.json in the same directory
"""

import json
import random
import uuid
from datetime import datetime, timedelta, timezone
import os

random.seed(500)

# ── Constants ────────────────────────────────────────────────────────────────

COUNTRIES = ["BR", "MX", "CO"]
COUNTRY_WEIGHTS = [0.50, 0.30, 0.20]

COUNTRY_CURRENCY = {"BR": "BRL", "MX": "MXN", "CO": "COP"}

# Payment method pools per country
# BR uses 50/50 split → pix reaches ~25% global share, credit_card ~60%
PAYMENT_METHODS_BY_COUNTRY = {
    "BR": (["credit_card", "pix"],        [0.50, 0.50]),
    "MX": (["credit_card", "oxxo"],       [0.70, 0.30]),
    "CO": (["credit_card", "pse"],        [0.70, 0.30]),
}

PROCESSORS = ["processor_a", "processor_b", "processor_c", "processor_d"]

# Processor D mostly handles Colombia
PROCESSOR_WEIGHTS_BY_COUNTRY = {
    "BR": [0.40, 0.35, 0.20, 0.05],
    "MX": [0.40, 0.35, 0.20, 0.05],
    "CO": [0.15, 0.15, 0.10, 0.60],  # Processor D dominates CO
}

SOFT_DECLINE_REASONS = [
    "insufficient_funds",
    "do_not_honor",
    "issuer_unavailable",
    "processing_error",
    "exceeded_limits",
]

HARD_DECLINE_REASONS = [
    "stolen_card",
    "invalid_card_number",
    "card_not_supported",
    "expired_card",
    "restricted_card",
]

CARD_BRANDS_BY_COUNTRY = {
    "BR": (["visa", "mastercard", "elo"],      [0.40, 0.35, 0.25]),
    "MX": (["visa", "mastercard", "amex"],     [0.50, 0.40, 0.10]),
    "CO": (["visa", "mastercard"],             [0.55, 0.45]),
}

# Pool of 200 customer IDs (repeated across transactions)
CUSTOMER_POOL = [f"cust_{random.randint(100000, 999999)}" for _ in range(200)]

N_TRANSACTIONS = 1000
END_DATE = datetime.now(timezone.utc)
START_DATE = END_DATE - timedelta(days=30)


# ── Helpers ──────────────────────────────────────────────────────────────────

def weighted_choice(population, weights):
    return random.choices(population, weights=weights, k=1)[0]


def random_timestamp():
    """Random timestamp in last 30 days. Hour distribution mimics real traffic."""
    total_seconds = int((END_DATE - START_DATE).total_seconds())
    offset = random.randint(0, total_seconds)
    ts = START_DATE + timedelta(seconds=offset)
    return ts


def base_decline_rate(processor: str, country: str, payment_method: str, hour: int, weekday: int) -> float:
    """
    Compute the probability that a transaction is declined (not approved/error).
    Embeds all required deliberate patterns.
    """
    # Base decline rate per processor
    proc_base = {
        "processor_a": 0.14,
        "processor_b": 0.25,   # Pattern 3: elevated decline rate
        "processor_c": 0.14,
        "processor_d": 0.12,   # Pattern 4: better performance
    }
    rate = proc_base[processor]

    # Pattern 2: BR + weekend → +30% relative
    if country == "BR" and weekday >= 5:
        rate *= 1.30

    # Pattern 1: processor_c + pix → boost base decline rate so absolute soft
    # decline rate ends up ~2x the average PIX soft decline rate.
    # With soft_proportion=90% (set in pick_decline_reason), rate=0.50 gives
    # ~49% absolute soft rate vs ~25% average → approx 2x.
    if processor == "processor_c" and payment_method == "pix":
        rate = 0.50

    # Pattern 5 & 6 handled at reason-selection time

    return rate


def pick_decline_reason(processor: str, payment_method: str, hour: int) -> tuple[str, str]:
    """
    Returns (decline_reason, 'soft'|'hard').
    Implements patterns:
      1. Processor C + PIX → 2× higher soft decline weight
      5. issuer_unavailable spikes 2am-5am UTC
      6. OXXO → higher processing_error weight
    """
    # Default soft:hard split ~70:30
    soft_weight = 70
    hard_weight = 30

    # Pattern 1: processor_c + pix doubles soft declines
    if processor == "processor_c" and payment_method == "pix":
        soft_weight = 90
        hard_weight = 10

    # Decide soft vs hard first
    decline_type = weighted_choice(["soft", "hard"], [soft_weight, hard_weight])

    if decline_type == "soft":
        # Build weights for soft reasons
        reason_weights = {
            "insufficient_funds":  30,
            "do_not_honor":        25,
            "issuer_unavailable":  15,
            "processing_error":    15,
            "exceeded_limits":     15,
        }
        # Pattern 5: issuer_unavailable spikes 2am-5am UTC
        if 2 <= hour < 5:
            reason_weights["issuer_unavailable"] = 50
            # Scale others down proportionally
            reason_weights["insufficient_funds"] = 20
            reason_weights["do_not_honor"]       = 15
            reason_weights["processing_error"]   = 10
            reason_weights["exceeded_limits"]    = 5

        # Pattern 6: OXXO has higher processing_error
        if payment_method == "oxxo":
            reason_weights["processing_error"] = 40

        reasons = list(reason_weights.keys())
        weights = list(reason_weights.values())
        reason = weighted_choice(reasons, weights)
    else:
        # Hard declines — uniform-ish
        reason_weights = {
            "stolen_card":         10,
            "invalid_card_number": 30,
            "card_not_supported":  20,
            "expired_card":        30,
            "restricted_card":     10,
        }
        reasons = list(reason_weights.keys())
        weights = list(reason_weights.values())
        reason = weighted_choice(reasons, weights)

    return reason, decline_type


def make_transaction(ts: datetime) -> dict:
    weekday = ts.weekday()   # 0=Mon … 6=Sun; 5=Sat, 6=Sun
    hour    = ts.hour

    country = weighted_choice(COUNTRIES, COUNTRY_WEIGHTS)
    methods, mweights = PAYMENT_METHODS_BY_COUNTRY[country]
    payment_method = weighted_choice(methods, mweights)

    proc_weights = PROCESSOR_WEIGHTS_BY_COUNTRY[country]
    processor = weighted_choice(PROCESSORS, proc_weights)

    # Determine status
    decline_rate = base_decline_rate(processor, country, payment_method, hour, weekday)
    error_rate   = 0.05
    # If both rates could overlap, cap them
    approved_rate = max(0, 1.0 - decline_rate - error_rate)

    status = weighted_choice(
        ["approved", "declined", "error"],
        [approved_rate, decline_rate, error_rate]
    )

    # Decline reason
    decline_reason = None
    is_soft_decline = None
    if status == "declined":
        reason, dtype = pick_decline_reason(processor, payment_method, hour)
        decline_reason = reason
        is_soft_decline = (dtype == "soft")

    # Amount — $15-$500 USD equivalent
    amount = round(random.uniform(15.0, 500.0), 2)

    # Card brand (only for credit_card)
    card_brand = None
    if payment_method == "credit_card":
        brands, bweights = CARD_BRANDS_BY_COUNTRY[country]
        card_brand = weighted_choice(brands, bweights)

    transaction_id = "txn_" + uuid.uuid4().hex[:12]
    customer_id    = random.choice(CUSTOMER_POOL)
    currency       = "USD"

    return {
        "transaction_id": transaction_id,
        "timestamp":      ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "amount":         amount,
        "currency":       currency,
        "country":        country,
        "payment_method": payment_method,
        "processor":      processor,
        "status":         status,
        "decline_reason": decline_reason,
        "is_soft_decline": is_soft_decline,
        "customer_id":    customer_id,
        "card_brand":     card_brand,
    }


# ── Main ─────────────────────────────────────────────────────────────────────

def generate_transactions(n: int = N_TRANSACTIONS) -> list[dict]:
    transactions = []
    for _ in range(n):
        ts = random_timestamp()
        txn = make_transaction(ts)
        transactions.append(txn)

    # Sort by timestamp ascending
    transactions.sort(key=lambda x: x["timestamp"])
    return transactions


def print_stats(transactions: list[dict]):
    total = len(transactions)
    statuses = {}
    for t in transactions:
        statuses[t["status"]] = statuses.get(t["status"], 0) + 1

    print(f"\n=== Generated {total} transactions ===")
    for s, c in sorted(statuses.items()):
        print(f"  {s:10s}: {c:4d}  ({c/total*100:.1f}%)")

    countries = {}
    for t in transactions:
        countries[t["country"]] = countries.get(t["country"], 0) + 1
    print("\nBy country:")
    for c, cnt in sorted(countries.items()):
        print(f"  {c}: {cnt} ({cnt/total*100:.1f}%)")

    methods = {}
    for t in transactions:
        methods[t["payment_method"]] = methods.get(t["payment_method"], 0) + 1
    print("\nBy payment method:")
    for m, cnt in sorted(methods.items()):
        print(f"  {m:15s}: {cnt} ({cnt/total*100:.1f}%)")

    # Processor B decline rate
    print("\nProcessor decline rates:")
    for proc in ["processor_a", "processor_b", "processor_c", "processor_d"]:
        ptxns = [t for t in transactions if t["processor"] == proc]
        pdec  = [t for t in ptxns if t["status"] == "declined"]
        if ptxns:
            print(f"  {proc}: {len(pdec)/len(ptxns)*100:.1f}% decline rate  ({len(ptxns)} txns)")

    # PIX + Processor C pattern
    pix_c = [t for t in transactions if t["payment_method"] == "pix" and t["processor"] == "processor_c"]
    pix_c_dec = [t for t in pix_c if t["status"] == "declined"]
    pix_a = [t for t in transactions if t["payment_method"] == "pix" and t["processor"] == "processor_a"]
    pix_a_dec = [t for t in pix_a if t["status"] == "declined"]
    if pix_c:
        print(f"\nPIX + Processor C decline rate: {len(pix_c_dec)/len(pix_c)*100:.1f}% ({len(pix_c)} txns)")
    if pix_a:
        print(f"PIX + Processor A decline rate: {len(pix_a_dec)/len(pix_a)*100:.1f}% ({len(pix_a)} txns)")


if __name__ == "__main__":
    print("Generating transactions...")
    transactions = generate_transactions(N_TRANSACTIONS)
    print_stats(transactions)

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "transactions.json")
    with open(out_path, "w") as f:
        json.dump(transactions, f, indent=2)

    print(f"\nSaved {len(transactions)} transactions to: {out_path}")
