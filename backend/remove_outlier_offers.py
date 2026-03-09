#!/usr/bin/env python
"""Remove offers whose price is an outlier (suspiciously low or high) for that product.

Uses per-product context: an offer is removed if its price is:
- Suspiciously low: has decimal when product has 1-2 offers (e.g. 4.90 vs 4900),
  or < median/10 when product has 3+ offers
- Suspiciously high: > median * 10 when product has 3+ offers

Creates backup before modifying. Run: cd backend && python3 remove_outlier_offers.py
"""
import sqlite3
import shutil
import sys
from datetime import datetime
from pathlib import Path

LOW_FACTOR = 10   # price < median/10 => low outlier
HIGH_FACTOR = 10  # price > median*10 => high outlier


def has_decimal(value):
    """True if value has a fractional part (e.g. 4.90, 1.50)."""
    return value > 0 and value != int(value) and value != round(value)


def is_low_outlier(price, all_prices):
    """Price is low outlier: decimal with few offers, or < median/10."""
    if price <= 0:
        return False
    others = [p for p in all_prices if p > 0]
    if len(others) <= 2:
        return has_decimal(price)
    median = sorted(others)[len(others) // 2]
    if median <= 0:
        return False
    return price < median / LOW_FACTOR


def is_high_outlier(price, all_prices):
    """Price is high outlier: > median * 10 (typo like 50000 instead of 500)."""
    if price <= 0 or len(all_prices) < 3:
        return False
    others = [p for p in all_prices if p > 0]
    median = sorted(others)[len(others) // 2]
    if median <= 0:
        return False
    return price > median * HIGH_FACTOR


def main():
    base = Path(__file__).resolve().parent
    db_path = base / "db.sqlite3"
    backup_path = base / f"db.sqlite3.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    if not db_path.exists():
        print(f"ERROR: {db_path} not found", file=sys.stderr)
        return 1

    print("=" * 55)
    print("Remove offers with outlier prices")
    print("=" * 55)

    # Backup
    print(f"Backing up {db_path} -> {backup_path}")
    shutil.copy2(db_path, backup_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("""
        SELECT o.id, o.product_id, o.merchant_id, o.price,
               p.name as product_name, m.name as merchant_name
        FROM products_priceoffer o
        JOIN products_product p ON p.id = o.product_id
        JOIN products_merchant m ON m.id = o.merchant_id
    """)
    rows = cur.fetchall()

    # Group by product_id
    by_product = {}
    for offer_id, product_id, merchant_id, price, product_name, merchant_name in rows:
        p = float(price) if price is not None else 0
        by_product.setdefault(product_id, []).append(
            (offer_id, merchant_id, p, product_name or "", merchant_name or "")
        )

    to_delete = []
    log_entries = []
    low_count = 0
    high_count = 0

    for product_id, offers in by_product.items():
        all_prices = [p for _, _, p, _, _ in offers if p > 0]
        if not all_prices:
            continue
        median = sorted(all_prices)[len(all_prices) // 2]
        for offer_id, merchant_id, price, product_name, merchant_name in offers:
            if price <= 0:
                continue
            if is_low_outlier(price, all_prices):
                to_delete.append(offer_id)
                low_count += 1
                log_entries.append({
                    "id": offer_id,
                    "product_name": product_name,
                    "merchant_name": merchant_name,
                    "price": price,
                    "median": median,
                    "reason": "low",
                })
            elif is_high_outlier(price, all_prices):
                to_delete.append(offer_id)
                high_count += 1
                log_entries.append({
                    "id": offer_id,
                    "product_name": product_name,
                    "merchant_name": merchant_name,
                    "price": price,
                    "median": median,
                    "reason": "high",
                })

    if not to_delete:
        print("No outlier offers found. Nothing to remove.")
        conn.close()
        return 0

    print(f"Found {len(to_delete)} outlier offers (low: {low_count}, high: {high_count})")

    # Write log file
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = base / f"outlier_offers_removed_{ts}.log"
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("Outlier offers removed\n")
        f.write("=" * 80 + "\n")
        f.write(f"Total: {len(to_delete)} (low: {low_count}, high: {high_count})\n\n")
        f.write(f"{'Product':<50} {'Merchant':<25} {'Price':>12} {'Median':>12} {'Reason':<6}\n")
        f.write("-" * 110 + "\n")
        for e in log_entries:
            prod = (e["product_name"][:47] + "..") if len(e["product_name"]) > 50 else e["product_name"]
            merch = (e["merchant_name"][:22] + "..") if len(e["merchant_name"]) > 25 else e["merchant_name"]
            f.write(f"{prod:<50} {merch:<25} {e['price']:>12.2f} {e['median']:>12.2f} {e['reason']:<6}\n")
    print(f"Logged to {log_path}")

    if "--dry-run" in sys.argv:
        print("Dry run - no changes made. Run without --dry-run to delete.")
        conn.close()
        return 0

    placeholders = ",".join("?" * len(to_delete))
    cur.execute(f"DELETE FROM products_priceoffer WHERE id IN ({placeholders})", to_delete)
    deleted = cur.rowcount
    conn.commit()
    conn.close()

    print(f"Deleted {deleted} offers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
