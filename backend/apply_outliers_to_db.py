#!/usr/bin/env python
"""Apply outlier price corrections to the database.
Uses same logic as scan_price_outliers_json.py; updates products_priceoffer.
Run: cd backend && python3 apply_outliers_to_db.py [db_path]
  db_path defaults to db.sqlite3. Use primini_from_json.sqlite3 for the JSON-built DB.
"""
import json
import os
import sqlite3
import sys
from pathlib import Path

from scan_price_outliers_json import (
    parse_price,
    format_price,
    is_product_outlier,
)


def slugify(s):
    if not s:
        return ""
    s = s.lower()
    result = []
    for c in s:
        if c.isalnum() or c == "-":
            result.append(c)
        elif result and result[-1] != "-":
            result.append("-")
    return "".join(result).strip("-")


def extract_slug_variants(url):
    if not url or "primini.ma" not in url:
        return []
    try:
        path = url.split("?", 1)[0].rstrip("/")
        parts = path.split("/")
        if len(parts) < 2:
            return []
        last = parts[-1]
        slug = slugify(last)
        if not slug:
            return []
        variants = [slug]
        if slug.startswith("de-") and len(slug) > 3:
            variants.append("de" + slug[2:])
        return variants
    except Exception:
        return []


def main(db_path=None):
    base = Path(__file__).resolve().parent
    data_dir = base.parent / "data"
    if db_path is None:
        db_path = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("APPLY_DB_PATH", str(base / "db.sqlite3"))
    db_path = Path(db_path)

    # Collect outliers (same logic as scan)
    results = []
    for jf in sorted(data_dir.rglob("*.json")):
        try:
            with open(jf, encoding="utf-8") as f:
                products = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue
        if not isinstance(products, list):
            continue
        for prod in products:
            offers = prod.get("offers_detail") or []
            product_url = prod.get("url") or ""
            for od in offers:
                prix_str = od.get("prix") or ""
                parsed = parse_price(prix_str)
                if parsed <= 0:
                    continue
                offer_data = [(o, parse_price(o.get("prix") or "")) for o in offers]
                all_prices = [p for _, p in offer_data if p > 0]
                if not all_prices or not is_product_outlier(parsed, all_prices):
                    continue
                new_value = int(round(parsed * 1000))
                new_str = format_price(new_value)
                results.append({
                    "product_url": product_url,
                    "boutique": (od.get("boutique") or "").strip(),
                    "old_value": parsed,
                    "new_value": new_value,
                    "new_prix": new_str,
                })

    if not results:
        print("No outlier offers to update.")
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT id, slug FROM products_product")
    slug_to_id = {slug: pid for pid, slug in cur.fetchall()}

    cur.execute("SELECT id, name FROM products_merchant")
    merchant_by_name = {}
    for mid, name in cur.fetchall():
        merchant_by_name[name] = mid
        merchant_by_name[name.lower()] = mid
        if name.endswith(" Maroc"):
            short = name[:-5].strip()
            merchant_by_name[short] = mid
            merchant_by_name[short.lower()] = mid

    updated = 0
    skipped = 0
    for r in results:
        slugs = extract_slug_variants(r["product_url"])
        product_id = None
        for slug in slugs:
            product_id = slug_to_id.get(slug)
            if product_id:
                break
        if not product_id:
            skipped += 1
            continue
        boutique = r["boutique"]
        variants = [boutique, boutique.replace(" Maroc", "").strip(), boutique.split()[0] if boutique else ""]
        merchant_id = None
        for v in variants:
            if not v:
                continue
            merchant_id = merchant_by_name.get(v) or merchant_by_name.get(v.lower())
            if merchant_id:
                break
        if not merchant_id:
            skipped += 1
            continue
        cur.execute(
            "UPDATE products_priceoffer SET price=?, raw_price_text=? WHERE product_id=? AND merchant_id=?",
            (r["new_value"], r["new_prix"], product_id, merchant_id),
        )
        if cur.rowcount > 0:
            updated += 1

    conn.commit()
    conn.close()
    print(f"Updated {updated} PriceOffer rows. Skipped {skipped} (product/merchant not found).")


if __name__ == "__main__":
    main(db_path=sys.argv[1] if len(sys.argv) > 1 else None)
