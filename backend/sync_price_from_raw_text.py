#!/usr/bin/env python3
"""
Update products_priceoffer.price from raw_price_text for each row.
Parses raw_price_text (e.g. "1 234,56 MAD", "899,00") to an integer and sets price.
Run from the backend directory: python sync_price_from_raw_text.py
"""
import os
import re
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "db.sqlite3")
TABLE = "products_priceoffer"


def parse_raw_price_to_int(raw_price_text: str | None) -> int | None:
    """Parse raw_price_text to integer (handles European format, MAD, spaces, etc.)."""
    if raw_price_text is None or not raw_price_text.strip():
        return None

    price_str = (
        raw_price_text.replace("MAD", "")
        .replace("DH", "")
        .replace("TTC", "")
        .replace("€", "")
        .replace("$", "")
        .strip()
    )
    price_str = price_str.replace(" ", "").replace("\u00a0", "").replace("\xa0", "")

    if "," in price_str:
        parts = price_str.split(",")
        integer_part = parts[0].replace(".", "").replace(" ", "")
        try:
            return int(integer_part)
        except ValueError:
            pass
    elif "." in price_str:
        parts = price_str.split(".")
        if len(parts) > 2:
            try:
                return int(price_str.replace(".", ""))
            except ValueError:
                pass
        elif len(parts) == 2:
            if len(parts[1]) <= 2:
                try:
                    return int(round(float(price_str)))
                except ValueError:
                    pass
            else:
                try:
                    return int(price_str.replace(".", ""))
                except ValueError:
                    pass

    match = re.search(r"[\d\s\.]+", price_str)
    if match:
        num_str = match.group().replace(" ", "").replace(".", "")
        try:
            return int(num_str)
        except ValueError:
            pass

    if "," in price_str:
        before_comma = price_str.split(",")[0]
        digits = re.sub(r"[^\d]", "", before_comma)
        if digits:
            try:
                return int(digits)
            except ValueError:
                pass
    else:
        digits = re.sub(r"[^\d]", "", price_str)
        if digits:
            try:
                return int(digits)
            except ValueError:
                pass

    return None


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute(
        """SELECT id, raw_price_text, price FROM products_priceoffer
           WHERE raw_price_text IS NOT NULL AND TRIM(COALESCE(raw_price_text, '')) != ''"""
    )
    rows = cur.fetchall()
    updated = 0
    skipped = 0
    errors = []

    for row in rows:
        offer_id, raw_text, current_price = row
        parsed = parse_raw_price_to_int(raw_text)
        if parsed is None:
            skipped += 1
            errors.append((offer_id, raw_text[:50]))
            continue
        try:
            current_int = int(round(float(current_price))) if current_price is not None else None
        except (TypeError, ValueError):
            current_int = None
        if current_int is not None and parsed == current_int:
            continue
        cur.execute("UPDATE products_priceoffer SET price = ? WHERE id = ?", (parsed, offer_id))
        updated += 1

    conn.commit()
    conn.close()

    print(f"Processed {len(rows)} rows with non-empty raw_price_text.")
    print(f"Updated {updated} row(s).")
    if skipped:
        print(f"Skipped (could not parse) {skipped} row(s).")
        if errors:
            print("First few parse failures:")
            for eid, text in errors[:5]:
                print(f"  id={eid}, raw_price_text={repr(text)}...")
    print("Done.")


if __name__ == "__main__":
    main()
