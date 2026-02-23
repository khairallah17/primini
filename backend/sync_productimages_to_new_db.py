#!/usr/bin/env python
"""Copy productimage entries from old DB to new DB for matching products.
Matches products by slug. Run: cd backend && python3 sync_productimages_to_new_db.py
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

    # Build slug -> new_product_id from new DB
    new_cur.execute("SELECT id, slug FROM products_product")
    new_slug_to_id = {slug: pid for pid, slug in new_cur.fetchall()}

    # Build slug -> old_product_id from old DB
    old_cur.execute("SELECT id, slug FROM products_product")
    old_slug_to_id = {slug: pid for pid, slug in old_cur.fetchall()}

    # Find matching slugs
    common_slugs = set(new_slug_to_id) & set(old_slug_to_id)
    print(f"Products in new DB: {len(new_slug_to_id)}")
    print(f"Products in old DB: {len(old_slug_to_id)}")
    print(f"Matching products (by slug): {len(common_slugs)}")

    # For each matched product, copy productimage entries
    total_copied = 0
    products_updated = 0
    for slug in common_slugs:
        old_pid = old_slug_to_id[slug]
        new_pid = new_slug_to_id[slug]
        old_cur.execute(
            "SELECT \"order\", created_at, image_url, image FROM products_productimage WHERE product_id=? ORDER BY \"order\"",
            (old_pid,),
        )
        rows = old_cur.fetchall()
        if not rows:
            continue
        for order, created_at, image_url, image in rows:
            new_cur.execute(
                """INSERT INTO products_productimage ("order", created_at, product_id, image_url, image)
                VALUES (?, ?, ?, ?, ?)""",
                (order, created_at, new_pid, image_url or "", image or ""),
            )
            total_copied += 1
        products_updated += 1

    new_conn.commit()
    old_conn.close()
    new_conn.close()

    print(f"Copied {total_copied} productimage rows for {products_updated} products into {new_db}")


if __name__ == "__main__":
    main()
