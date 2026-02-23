#!/usr/bin/env python
"""Apply outlier price corrections to data/*.json files.
Updates prix in offers_detail in place. Run: cd backend && python3 apply_outliers_to_json.py
"""
import json
from pathlib import Path

from scan_price_outliers_json import (
    parse_price,
    format_price,
    is_product_outlier,
)


def main():
    data_dir = Path(__file__).resolve().parent.parent / "data"
    json_files = sorted(data_dir.rglob("*.json"))
    total_updated = 0
    files_modified = 0

    for jf in json_files:
        try:
            with open(jf, encoding="utf-8") as f:
                products = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"  [SKIP] {jf.relative_to(data_dir)}: {e}")
            continue

        if not isinstance(products, list):
            continue

        file_updated = 0
        for prod in products:
            offers = prod.get("offers_detail") or []
            offer_data = [(od, parse_price(od.get("prix") or "")) for od in offers]
            all_prices = [p for _, p in offer_data if p > 0]
            if not all_prices:
                continue
            for od, parsed in offer_data:
                if parsed <= 0 or not is_product_outlier(parsed, all_prices):
                    continue
                new_str = format_price(parsed * 1000)
                od["prix"] = new_str
                file_updated += 1

        if file_updated > 0:
            with open(jf, "w", encoding="utf-8") as f:
                json.dump(products, f, ensure_ascii=False, indent=2)
            total_updated += file_updated
            files_modified += 1
            print(f"  {jf.relative_to(data_dir)}: {file_updated} offers updated")

    print(f"\nDone. Updated {total_updated} offers in {files_modified} files.")


if __name__ == "__main__":
    main()
