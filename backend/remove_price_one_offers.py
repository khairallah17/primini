#!/usr/bin/env python3
"""
Remove from products_priceoffer:
  - rows where price = 1
  - rows where raw_price_text is empty (NULL or '' or whitespace-only)
Run from the backend directory: python remove_price_one_offers.py
"""
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "db.sqlite3")
TABLE = "products_priceoffer"


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Rows with price = 1
    cur.execute(
        "SELECT id, product_id, merchant_id, price FROM products_priceoffer WHERE CAST(price AS REAL) = 1"
    )
    price_one_rows = cur.fetchall()
    if price_one_rows:
        print(f"Found {len(price_one_rows)} offer(s) with price = 1:")
        for row in price_one_rows:
            print(f"  id={row[0]}, product_id={row[1]}, merchant_id={row[2]}, price={row[3]}")
        cur.execute("DELETE FROM products_priceoffer WHERE CAST(price AS REAL) = 1")
        print(f"  -> Deleted {cur.rowcount} row(s).")
    else:
        print("No offers with price = 1 found.")

    # 2. Rows with empty raw_price_text (NULL or '' or whitespace)
    cur.execute(
        """SELECT id, product_id, merchant_id, price, raw_price_text
           FROM products_priceoffer
           WHERE raw_price_text IS NULL OR TRIM(COALESCE(raw_price_text, '')) = ''"""
    )
    empty_text_rows = cur.fetchall()
    if empty_text_rows:
        print(f"\nFound {len(empty_text_rows)} offer(s) with empty raw_price_text:")
        for row in empty_text_rows[:10]:  # show first 10
            print(f"  id={row[0]}, product_id={row[1]}, merchant_id={row[2]}, price={row[3]}")
        if len(empty_text_rows) > 10:
            print(f"  ... and {len(empty_text_rows) - 10} more")
        cur.execute(
            """DELETE FROM products_priceoffer
               WHERE raw_price_text IS NULL OR TRIM(COALESCE(raw_price_text, '')) = ''"""
        )
        print(f"  -> Deleted {cur.rowcount} row(s).")
    else:
        print("\nNo offers with empty raw_price_text found.")

    conn.commit()
    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
