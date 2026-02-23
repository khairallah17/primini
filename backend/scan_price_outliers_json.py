#!/usr/bin/env python
"""Scan all data/*.json files for outlier prices in offers_detail.
Uses per-product context: only multiplies prices that are outliers
(suspiciously small or large) relative to other offers for the same product.
Shows what would become after multiplying by 1000. Dry run only.
"""
import json
import re
import sys
from pathlib import Path


def parse_price(price_str):
    if not price_str:
        return 0.0
    price_clean = re.sub(r"[^\d.,]", "", str(price_str))
    if "," in price_clean and "." in price_clean:
        price_clean = price_clean.replace(",", "")
    elif "," in price_clean:
        parts = price_clean.split(",")
        if len(parts) == 2 and len(parts[1]) > 2:
            price_clean = price_clean.replace(",", "")
        else:
            price_clean = price_clean.replace(",", ".")
    try:
        return float(price_clean)
    except ValueError:
        return 0.0


def format_price(num):
    """Format as DH string (e.g. 4900 -> '4 900 DH')."""
    s = str(int(round(num)))
    if len(s) > 3:
        parts = []
        for i, c in enumerate(reversed(s)):
            if i > 0 and i % 3 == 0:
                parts.append(" ")
            parts.append(c)
        s = "".join(reversed(parts))
    return f"{s} DH"


def has_decimal(value):
    """True if value has a fractional part (e.g. 4.90, 1.50)."""
    return value > 0 and value != int(value)


def is_product_outlier(parsed_value, all_prices, factor=10, max_new_value=50000):
    """Price is outlier: either (a) has decimal when product has 1-2 offers,
    or (b) suspiciously small vs median when product has 3+ offers.
    Excludes if new value would exceed max_new_value.
    """
    if parsed_value <= 0:
        return False
    others = [p for p in all_prices if p > 0]
    if parsed_value * 1000 > max_new_value:
        return False
    # Products with 1 or 2 offers: multiply if price has a dot
    if len(others) <= 2:
        return has_decimal(parsed_value)
    # Products with 3+ offers: use median-based outlier detection
    median = sorted(others)[len(others) // 2]
    if median <= 0:
        return False
    return parsed_value < median / factor


def main():
    data_dir = Path(__file__).resolve().parent.parent / "data"
    json_files = sorted(data_dir.rglob("*.json"))
    results = []
    total_outliers = 0

    for jf in json_files:
        try:
            with open(jf, encoding="utf-8") as f:
                products = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"  [SKIP] {jf.relative_to(data_dir)}: {e}")
            continue

        if not isinstance(products, list):
            continue

        rel = jf.relative_to(data_dir)
        for prod in products:
            offers = prod.get("offers_detail") or []
            name = (prod.get("name") or "")[:60]
            # Collect all parsed prices for this product
            offer_data = []
            for od in offers:
                prix_str = od.get("prix") or ""
                parsed = parse_price(prix_str)
                offer_data.append((od, prix_str, parsed))
            all_prices = [p for _, _, p in offer_data if p > 0]
            if not all_prices:
                continue
            for od, prix_str, parsed in offer_data:
                if parsed <= 0:
                    continue
                if not is_product_outlier(parsed, all_prices):
                    continue
                new_value = parsed * 1000
                new_str = format_price(new_value)
                results.append({
                    "file": str(rel),
                    "product": name,
                    "boutique": od.get("boutique") or "",
                    "old_prix": prix_str,
                    "old_value": parsed,
                    "new_value": new_value,
                    "new_prix": new_str,
                })
                total_outliers += 1

    # Print results
    print("=" * 80)
    print("OUTLIER PRICES IN offers_detail (would multiply by 1000)")
    print("=" * 80)
    print(f"Total outlier offers: {total_outliers}")
    print(f"Total products affected: {len({r['file'] + r['product'] for r in results})}")
    print()
    print(f"{'File':<45} {'Product':<35} {'Old':>15} {'New':>15}")
    print("-" * 110)
    for r in results[:200]:
        prod_short = (r["product"] or "-")[:33] + ".." if len(r["product"] or "") > 35 else (r["product"] or "-")
        print(f"{r['file']:<45} {prod_short:<35} {r['old_prix']:>15} {r['new_prix']:>15}")
    if len(results) > 200:
        print(f"... and {len(results) - 200} more")
    print()
    print("Add --json to output full list as JSON.")

    if "--json" in sys.argv:
        print("\n--- JSON output ---")
        print(json.dumps(results, ensure_ascii=False, indent=2))

    return results


if __name__ == "__main__":
    import sys
    main()
