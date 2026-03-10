#!/usr/bin/env python
"""Normalize product and category slugs to ASCII (replace é→e, etc).

Handles collisions by appending -1, -2, etc. Creates backup and log.
Run: cd backend && python3 normalize_slugs.py
"""
import shutil
import sqlite3
import sys
import unicodedata
from datetime import datetime
from pathlib import Path


def ascii_slugify(s):
    """Convert to lowercase ASCII slug. é→e, à→a, etc."""
    if not s:
        return ""
    # NFD decomposes é -> e + combining accent; encode/decode strips combining chars
    s = unicodedata.normalize("NFD", str(s).lower())
    s = s.encode("ascii", "ignore").decode("ascii")
    result = []
    for c in s:
        if c.isalnum() or c == "-":
            result.append(c)
        elif result and result[-1] != "-":
            result.append("-")
    return "".join(result).strip("-")[:210]  # Product slug max 210


def main():
    base = Path(__file__).resolve().parent
    db_path = base / "db.sqlite3"
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = base / f"db.sqlite3.backup.{ts}"
    log_path = base / f"normalize_slugs_{ts}.log"

    if not db_path.exists():
        print(f"ERROR: {db_path} not found", file=sys.stderr)
        return 1

    print("=" * 55)
    print("Normalize slugs to ASCII")
    print("=" * 55)
    print(f"Backing up {db_path} -> {backup_path}")
    shutil.copy2(db_path, backup_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    updates = []
    log_lines = []

    def process_table(table, id_col, slug_col, max_slug_len=160):
        cur.execute(f"SELECT {id_col}, {slug_col} FROM {table}")
        rows = cur.fetchall()
        used = {}
        for row_id, old_slug in rows:
            if not old_slug:
                continue
            new_slug = ascii_slugify(old_slug)[:max_slug_len]
            if not new_slug:
                new_slug = str(row_id)
            # Handle collisions
            base_slug = new_slug
            suffix = 0
            while new_slug in used:
                suffix += 1
                new_slug = f"{base_slug}-{suffix}"[:max_slug_len]
            used[new_slug] = row_id
            if new_slug != old_slug:
                updates.append((table, id_col, row_id, slug_col, old_slug, new_slug))
                log_lines.append(f"  {table} {row_id}: {old_slug!r} -> {new_slug!r}")

    process_table("products_category", "id", "slug", 160)
    process_table("products_product", "id", "slug", 210)

    if not updates:
        print("No slugs need normalization.")
        conn.close()
        return 0

    print(f"Updating {len(updates)} slugs")

    with open(log_path, "w", encoding="utf-8") as f:
        f.write("Slug normalization log\n")
        f.write("=" * 60 + "\n\n")
        for line in log_lines:
            f.write(line + "\n")
    print(f"Logged to {log_path}")

    if "--dry-run" in sys.argv:
        print("Dry run - no changes made. Run without --dry-run to apply.")
        conn.close()
        return 0

    for table, id_col, row_id, slug_col, _old, new_slug in updates:
        cur.execute(f"UPDATE {table} SET {slug_col}=? WHERE {id_col}=?", (new_slug, row_id))

    conn.commit()
    conn.close()
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
