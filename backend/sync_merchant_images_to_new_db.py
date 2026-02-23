#!/usr/bin/env python
"""Copy merchant logo/logo_file from old DB to new DB for matching merchants.
Matches by name (exact and variants). Run: cd backend && python3 sync_merchant_images_to_new_db.py
"""
import sqlite3
from pathlib import Path


def main():
    base = Path(__file__).resolve().parent
    old_db = base / "db.sqlite3"
    new_db = base / "primini_from_json.sqlite3"

    old_conn = sqlite3.connect(old_db)
    new_conn = sqlite3.connect(new_db)
    old_cur = old_conn.cursor()
    new_cur = new_conn.cursor()

    old_cur.execute("SELECT id, name, logo, logo_file FROM products_merchant")
    old_merchants = {row[1]: (row[2], row[3]) for row in old_cur.fetchall()}
    for name, (logo, lf) in list(old_merchants.items()):
        if name.endswith(" Maroc"):
            short = name[:-5].strip()
            if short not in old_merchants:
                old_merchants[short] = (logo, lf)
        if name and " " in name:
            first = name.split()[0]
            if first not in old_merchants:
                old_merchants[first] = (logo, lf)

    new_cur.execute("SELECT id, name FROM products_merchant")
    new_merchants = list(new_cur.fetchall())

    updated = 0
    for new_id, new_name in new_merchants:
        logo, logo_file = None, None
        for key in [new_name, new_name.replace(" Maroc", "").strip(), new_name.split()[0] if new_name else ""]:
            if key and key in old_merchants:
                logo, logo_file = old_merchants[key]
                break
        if logo or logo_file:
            new_cur.execute(
                "UPDATE products_merchant SET logo=?, logo_file=? WHERE id=?",
                (logo or "", logo_file or "", new_id),
            )
            if new_cur.rowcount:
                updated += 1

    new_conn.commit()
    old_conn.close()
    new_conn.close()

    print(f"Updated logo/logo_file for {updated} merchants in {new_db}")


if __name__ == "__main__":
    main()
