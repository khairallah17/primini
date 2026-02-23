#!/usr/bin/env python
"""Create a new SQLite3 database from data/*.json files.
Output: primini_from_json.sqlite3
Run: cd backend && python3 create_db_from_json.py
"""
import shutil
import sqlite3
from pathlib import Path

from reload_offers_standalone import main as reload_main


def main():
    base = Path(__file__).resolve().parent
    existing_db = base / "db.sqlite3"
    new_db = base / "primini_from_json.sqlite3"

    # 1. Copy existing DB (preserves schema + categories)
    if new_db.exists():
        new_db.unlink()
    shutil.copy2(existing_db, new_db)

    # 2. Clear product data
    conn = sqlite3.connect(new_db)
    cur = conn.cursor()
    cur.execute("DELETE FROM products_priceoffer")
    cur.execute("DELETE FROM products_productimage")
    cur.execute("DELETE FROM products_popularproduct")
    cur.execute("DELETE FROM products_promotion_products")
    cur.execute("DELETE FROM alerts_alert")
    cur.execute("DELETE FROM products_product")
    cur.execute("DELETE FROM products_merchant")
    conn.commit()
    conn.close()

    # 3. Reload from JSON into the new DB
    reload_main(db_path=new_db)

    conn = sqlite3.connect(new_db)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM products_product")
    n_products = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM products_priceoffer")
    n_offers = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM products_merchant")
    n_merchants = cur.fetchone()[0]
    conn.close()

    print(f"\nCreated {new_db}")
    print(f"  Products: {n_products}")
    print(f"  PriceOffers: {n_offers}")
    print(f"  Merchants: {n_merchants}")


if __name__ == "__main__":
    main()
