#!/usr/bin/env python3
"""
Delete from products_priceoffer all rows where price = 1.
Run from backend: python remove_price_one_offers.py
"""
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "db.sqlite3")


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM products_priceoffer WHERE CAST(price AS REAL) = 1"
    )
    deleted = cur.rowcount
    conn.commit()
    conn.close()
    print(f"Deleted {deleted} offer(s) with price = 1.")
    print("Done.")


if __name__ == "__main__":
    main()
