#!/usr/bin/env python3
"""
Remove all rows from products_priceoffer where price = 1.
These are likely bad data (e.g. misparsed "1.000" as 1).
"""
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "db.sqlite3")
TABLE = "products_priceoffer"


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute(
        "SELECT id, product_id, merchant_id, price FROM products_priceoffer WHERE CAST(price AS REAL) = 1"
    )
    rows = cur.fetchall()
    count = len(rows)

    if count == 0:
        print("No offers with price = 1 found.")
        conn.close()
        return

    print(f"Found {count} offer(s) with price = 1:")
    for row in rows:
        print(f"  id={row[0]}, product_id={row[1]}, merchant_id={row[2]}, price={row[3]}")

    cur.execute(
        "DELETE FROM products_priceoffer WHERE CAST(price AS REAL) = 1"
    )
    conn.commit()
    deleted = cur.rowcount
    conn.close()

    print(f"\nDeleted {deleted} row(s).")


if __name__ == "__main__":
    main()
