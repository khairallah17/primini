#!/usr/bin/env python
"""Replace outlier offer prices.

Rules:
1. Product with exactly 2 offers and wide difference (high/low >= 10):
   Replace smallest with (high - 10).
2. Otherwise: replace outliers with mean of non-outliers.
   Outlier detection: low (decimal or < median/10), high (> median*10).
   Fallback: median if all are outliers.

Creates backup and log. Run: cd backend && python3 replace_outlier_prices.py
"""
import sqlite3
import shutil
import sys
from datetime import datetime
from pathlib import Path

LOW_FACTOR = 10
HIGH_FACTOR = 10
WIDE_DIFF_RATIO = 10  # high/low >= this => wide difference for 2-offer products


def has_decimal(value):
    return value > 0 and value != int(value) and value != round(value)


def is_low_outlier(price, all_prices):
    if price <= 0:
        return False
    others = [p for p in all_prices if p > 0]
    if len(others) <= 2:
        return has_decimal(price)
    median = sorted(others)[len(others) // 2]
    return median > 0 and price < median / LOW_FACTOR


def is_high_outlier(price, all_prices):
    if price <= 0 or len(all_prices) < 3:
        return False
    others = [p for p in all_prices if p > 0]
    median = sorted(others)[len(others) // 2]
    return median > 0 and price > median * HIGH_FACTOR


def format_price(num):
    """Format as MAD string."""
    s = str(int(round(num)))
    if len(s) > 3:
        parts = []
        for i, c in enumerate(reversed(s)):
            if i > 0 and i % 3 == 0:
                parts.append(" ")
            parts.append(c)
        s = "".join(reversed(parts))
    return f"{s} MAD"


def main():
    base = Path(__file__).resolve().parent
    db_path = base / "db.sqlite3"
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = base / f"db.sqlite3.backup.{ts}"

    if not db_path.exists():
        print(f"ERROR: {db_path} not found", file=sys.stderr)
        return 1

    print("=" * 55)
    print("Replace outlier prices (mean or high-10 for 2-offer wide diff)")
    print("=" * 55)

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

    by_product = {}
    for offer_id, product_id, merchant_id, price, product_name, merchant_name in rows:
        p = float(price) if price is not None else 0
        by_product.setdefault(product_id, []).append(
            (offer_id, merchant_id, p, product_name or "", merchant_name or "")
        )

    updates = []
    log_entries = []

    for product_id, offers in by_product.items():
        all_prices = [p for _, _, p, _, _ in offers if p > 0]
        if not all_prices:
            continue

        # Special case: exactly 2 offers with wide difference
        if len(all_prices) == 2:
            low_p, high_p = sorted(all_prices)
            if low_p > 0 and high_p / low_p >= WIDE_DIFF_RATIO:
                replacement = round(high_p - 10, 2)
                if replacement < 0:
                    replacement = 0
                # Find the offer with the low price
                for offer_id, merchant_id, price, product_name, merchant_name in offers:
                    if price > 0 and price == low_p:
                        updates.append((replacement, format_price(replacement), offer_id))
                        log_entries.append({
                            "product_name": product_name,
                            "merchant_name": merchant_name,
                            "old_price": price,
                            "new_price": replacement,
                            "reason": "2wide",
                        })
                        break
                continue

        # General outlier logic
        outlier_offers = []
        for offer_id, merchant_id, price, product_name, merchant_name in offers:
            if price <= 0:
                continue
            if is_low_outlier(price, all_prices):
                outlier_offers.append((offer_id, merchant_id, price, product_name, merchant_name, "low"))
            elif is_high_outlier(price, all_prices):
                outlier_offers.append((offer_id, merchant_id, price, product_name, merchant_name, "high"))

        if not outlier_offers:
            continue

        # Mean of non-outliers; fallback to median if all are outliers
        outlier_ids = {o[0] for o in outlier_offers}
        non_outlier_prices = []
        for offer_id, _, price, _, _ in offers:
            if price > 0 and offer_id not in outlier_ids:
                non_outlier_prices.append(price)

        if non_outlier_prices:
            replacement = sum(non_outlier_prices) / len(non_outlier_prices)
        else:
            replacement = sorted(all_prices)[len(all_prices) // 2]

        replacement = round(replacement, 2)

        for offer_id, merchant_id, old_price, product_name, merchant_name, reason in outlier_offers:
            updates.append((replacement, format_price(replacement), offer_id))
            log_entries.append({
                "product_name": product_name,
                "merchant_name": merchant_name,
                "old_price": old_price,
                "new_price": replacement,
                "reason": reason,
            })

    if not updates:
        print("No outlier offers found. Nothing to update.")
        conn.close()
        return 0

    print(f"Found {len(updates)} outlier offers to update")

    log_path = base / f"outlier_prices_replaced_{ts}.log"
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("Outlier prices replaced (mean, or high-10 for 2-offer wide diff)\n")
        f.write("=" * 80 + "\n")
        f.write(f"Total: {len(updates)}\n\n")
        f.write(f"{'Product':<50} {'Merchant':<22} {'Old':>12} {'New':>12} {'Reason':<6}\n")
        f.write("-" * 108 + "\n")
        for e in log_entries:
            prod = (e["product_name"][:47] + "..") if len(e["product_name"]) > 50 else e["product_name"]
            merch = (e["merchant_name"][:20] + "..") if len(e["merchant_name"]) > 22 else e["merchant_name"]
            f.write(f"{prod:<50} {merch:<22} {e['old_price']:>12.2f} {e['new_price']:>12.2f} {e['reason']:<6}\n")
    print(f"Logged to {log_path}")

    if "--dry-run" in sys.argv:
        print("Dry run - no changes made. Run without --dry-run to update.")
        conn.close()
        return 0

    for new_price, raw_text, offer_id in updates:
        cur.execute(
            "UPDATE products_priceoffer SET price=?, raw_price_text=? WHERE id=?",
            (new_price, raw_text, offer_id),
        )
    conn.commit()
    conn.close()

    print(f"Updated {len(updates)} offers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
