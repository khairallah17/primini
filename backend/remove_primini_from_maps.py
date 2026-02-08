#!/usr/bin/env python3
"""
Remove the "primini" key from raw_url_map and raw_price_map JSON columns
in products_product table.
"""
import json
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "db.sqlite3")
KEY_TO_REMOVE_LOWER = "primini"  # match case-insensitively (primini, Primini, PRIMINI)


def remove_key_from_obj(obj: dict) -> dict:
    """Return a copy of obj without any key that equals 'primini' case-insensitively."""
    out = {k: v for k, v in obj.items() if (k or "").lower() != KEY_TO_REMOVE_LOWER}
    return out


def process_value(raw: str | None) -> tuple[str | None, bool]:
    """
    Parse JSON, remove primini key, return (new_json_str, changed).
    Return (None, False) if raw is None or empty.
    """
    if raw is None or not raw.strip():
        return raw, False
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            return raw, False
        new_data = remove_key_from_obj(data)
        if new_data == data:
            return raw, False
        return json.dumps(new_data, ensure_ascii=False), True
    except (json.JSONDecodeError, TypeError):
        return raw, False


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        "SELECT id, raw_price_map, raw_url_map FROM products_product"
    )
    rows = cur.fetchall()
    total = 0
    updated = 0

    for row in rows:
        total += 1
        pid = row["id"]
        raw_price = row["raw_price_map"]
        raw_url = row["raw_url_map"]

        new_price, price_changed = process_value(raw_price)
        new_url, url_changed = process_value(raw_url)

        if price_changed or url_changed:
            cur.execute(
                """
                UPDATE products_product
                SET raw_price_map = ?, raw_url_map = ?
                WHERE id = ?
                """,
                (new_price or raw_price, new_url or raw_url, pid),
            )
            updated += 1

    conn.commit()
    conn.close()
    print(f"Processed {total} rows, updated {updated} rows (removed 'primini' key where present).")


if __name__ == "__main__":
    main()
