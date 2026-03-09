#!/usr/bin/env python
"""Remove all offers for merchants with fewer than 20 offers.

Creates a backup before modifying. Run from backend: python3 remove_small_merchant_offers.py
"""
import sqlite3
import shutil
import sys
from datetime import datetime
from pathlib import Path

MIN_OFFERS = 20


def main():
    base = Path(__file__).resolve().parent
    db_path = base / "db.sqlite3"
    backup_path = base / f"db.sqlite3.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    if not db_path.exists():
        print(f"ERROR: {db_path} not found", file=sys.stderr)
        return 1

    print("=" * 50)
    print("Remove offers for merchants with < 20 offers")
    print("=" * 50)

    # Backup
    print(f"Backing up {db_path} -> {backup_path}")
    shutil.copy2(db_path, backup_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Find merchant IDs with < 20 offers
    cur.execute(
        """
        SELECT merchant_id, COUNT(*) as cnt
        FROM products_priceoffer
        GROUP BY merchant_id
        HAVING cnt < ?
        ORDER BY cnt
        """,
        (MIN_OFFERS,),
    )
    small_merchants = cur.fetchall()

    if not small_merchants:
        print("No merchants with < 20 offers. Nothing to do.")
        conn.close()
        return 0

    merchant_ids = [m[0] for m in small_merchants]
    total_offers_to_delete = sum(m[1] for m in small_merchants)

    print(f"Found {len(merchant_ids)} merchants with < {MIN_OFFERS} offers")
    print(f"Total offers to remove: {total_offers_to_delete}")

    # Delete offers for those merchants
    placeholders = ",".join("?" * len(merchant_ids))
    cur.execute(
        f"DELETE FROM products_priceoffer WHERE merchant_id IN ({placeholders})",
        merchant_ids,
    )
    deleted = cur.rowcount
    conn.commit()
    conn.close()

    print(f"Deleted {deleted} offers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
