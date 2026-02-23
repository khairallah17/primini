#!/usr/bin/env python
"""Standalone script: sync products and offers from data/*_with_descriptions.json files.
Creates products and offers if they don't exist. Uses sqlite3 only (no Django).
Run: cd backend && python3 reload_offers_standalone.py
"""
import json
import re
import sqlite3
from pathlib import Path
from urllib.parse import urlparse

# Category folder (data/) -> parent category slug in DB
CATEGORY_FOLDER_MAP = {
    "electromenager": "electromenager",
    "informatique": "informatique",
    "petit_electromenager": "petit-electromenager",
    "telephonie": "telephonie",
    "sante_beaute": "sante-beaute",
    "photo_camera": "photo-camera",
    "image_et_son": "image-son",
}

SUBCATEGORY_SLUG_OVERRIDES = {
    "refrigerateurs": "refrigerateurs-et-congelateurs",
    "congelateurs": "refrigerateurs-et-congelateurs",
}


def slugify(s):
    if not s:
        return ""
    s = s.lower()
    result = []
    for c in s:
        if c.isalnum() or c == "-":
            result.append(c)
        elif result and result[-1] != "-":
            result.append("-")
    return "".join(result).strip("-")


def filename_to_subcategory_slug(filename_stem):
    override = SUBCATEGORY_SLUG_OVERRIDES.get(filename_stem)
    if override:
        return override
    normalized = filename_stem.replace("__", "-").replace("_", "-")
    return slugify(normalized) or filename_stem


def extract_slug_variants(url):
    if not url or "primini.ma" not in url:
        return []
    try:
        path = url.split("?", 1)[0].rstrip("/")
        parts = path.split("/")
        if len(parts) < 2:
            return []
        last = parts[-1]
        slug = slugify(last)
        if not slug:
            return []
        variants = [slug]
        if slug.startswith("de-") and len(slug) > 3:
            variants.append("de" + slug[2:])
        return variants
    except Exception:
        return []


def parse_price(price_str):
    if not price_str:
        return 0.0
    price_clean = re.sub(r"[^\d.,]", "", str(price_str))
    if "," in price_clean and "." in price_clean:
        price_clean = price_clean.replace(",", "")
    elif "," in price_clean:
        parts = price_clean.split(",")
        if len(parts) == 2 and len(parts[1]) > 2:
            price_clean = price_clean.replace(",", "")
        else:
            price_clean = price_clean.replace(",", ".")
    try:
        return float(price_clean)
    except ValueError:
        return 0.0


def map_stock(s):
    if not s:
        return "in_stock"
    s = str(s).lower()
    if "hors stock" in s or "rupture" in s:
        return "out_of_stock"
    if "stock faible" in s or "faible" in s:
        return "low_stock"
    return "in_stock"


def main():
    base = Path(__file__).resolve().parent
    data_dir = base.parent / "data"
    db_path = base / "db.sqlite3"

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Build category slug -> (category_id, subcategory_id map)
    cur.execute("SELECT id, slug, parent_id FROM products_category")
    cat_rows = cur.fetchall()
    cat_slug_to_id = {slug: cid for cid, slug, _ in cat_rows}
    subcat_by_parent = {}
    for cid, slug, parent_id in cat_rows:
        if parent_id is not None:
            subcat_by_parent.setdefault(parent_id, {})[slug] = cid

    # Build slug -> product_id map (refresh as we create products)
    def refresh_product_map():
        cur.execute("SELECT id, slug FROM products_product")
        return {slug: pid for pid, slug in cur.fetchall()}

    slug_to_id = refresh_product_map()

    # Build merchant name -> id map
    cur.execute("SELECT id, name FROM products_merchant")
    merchant_by_name = {}
    for mid, name in cur.fetchall():
        merchant_by_name[name] = mid
        merchant_by_name[name.lower()] = mid
        if name.endswith(" Maroc"):
            short = name[:-5].strip()
            merchant_by_name[short] = mid
            merchant_by_name[short.lower()] = mid

    def get_or_create_merchant(boutique, offer_url):
        variants = [
            boutique,
            boutique.replace(" Maroc", "").strip(),
            boutique.split()[0] if boutique else "",
        ]
        for v in variants:
            if not v:
                continue
            mid = merchant_by_name.get(v) or merchant_by_name.get(v.lower())
            if mid:
                return mid
        domain = ""
        if offer_url:
            try:
                parsed = urlparse(offer_url)
                domain = f"{parsed.scheme}://{parsed.netloc}"
            except Exception:
                pass
        cur.execute(
            "INSERT INTO products_merchant (name, logo, website, description, pay_status) VALUES (?, '', ?, '', 0)",
            (variants[0], domain),
        )
        mid = cur.lastrowid
        merchant_by_name[variants[0]] = mid
        return mid

    def get_category_ids(category_folder, filename_stem):
        parent_slug = CATEGORY_FOLDER_MAP.get(
            category_folder, slugify(category_folder.replace("_", " "))
        )
        sub_slug = filename_to_subcategory_slug(filename_stem)
        cat_id = cat_slug_to_id.get(parent_slug)
        sub_id = None
        if cat_id:
            sub_id = subcat_by_parent.get(cat_id, {}).get(sub_slug)
        if not sub_id and sub_slug:
            sub_id = cat_slug_to_id.get(sub_slug)
        return cat_id, sub_id

    def get_or_create_product(p, category_folder, filename_stem):
        slugs = extract_slug_variants(p.get("url") or "")
        for slug in slugs:
            pid = slug_to_id.get(slug)
            if pid:
                return pid
        if not slugs:
            return None
        slug = slugs[0]
        name = (p.get("name") or "").strip()
        if not name:
            return None
        brand = name.split()[0] if name else "Unknown"
        if len(brand) > 120:
            brand = brand[:120]
        description = (p.get("description") or "").strip() or ""
        image = (p.get("image") or "").strip() or ""
        cat_id, sub_id = get_category_ids(category_folder, filename_stem)
        cur.execute(
            """INSERT INTO products_product (
                name, slug, description, specs, image, brand, release_date, tags,
                created_at, updated_at, category_id, raw_price_map, raw_url_map,
                source_category, approval_status, rejection_reason, subcategory_id
            ) VALUES (?, ?, ?, '{}', ?, ?, NULL, '[]', datetime('now'), datetime('now'),
                ?, '{}', '{}', ?, 'approved', '', ?)""",
            (
                name[:200],
                slug[:210],
                description,
                image[:200],
                brand[:120],
                cat_id,
                category_folder or "",
                sub_id,
            ),
        )
        pid = cur.lastrowid
        slug_to_id[slug] = pid
        return pid

    offers_created = 0
    offers_updated = 0
    products_created = 0
    for json_path in sorted(data_dir.glob("*/*_with_descriptions.json")):
        try:
            with open(json_path, encoding="utf-8") as f:
                products = json.load(f)
        except Exception:
            continue
        if not isinstance(products, list):
            continue
        rel_parts = json_path.relative_to(data_dir).parts
        category_folder = rel_parts[0] if rel_parts else ""
        filename_stem = json_path.stem.replace("_with_descriptions", "")

        for p in products:
            product_id = None
            for slug in extract_slug_variants(p.get("url") or ""):
                product_id = slug_to_id.get(slug)
                if product_id:
                    break
            if not product_id:
                product_id = get_or_create_product(p, category_folder, filename_stem)
                if product_id:
                    products_created += 1
            if not product_id:
                continue

            for od in p.get("offers_detail") or []:
                boutique = (od.get("boutique") or "").strip()
                if not boutique:
                    continue
                price = parse_price(od.get("prix") or "")
                if price <= 0:
                    continue
                merchant_id = get_or_create_merchant(boutique, od.get("lien_offre") or "")
                offer_url = (od.get("lien_offre") or "").strip() or "https://primini.ma/"
                stock = map_stock(od.get("etat_stock"))
                raw = str(od.get("prix") or "")[:64]

                cur.execute(
                    "SELECT id FROM products_priceoffer WHERE product_id=? AND merchant_id=?",
                    (product_id, merchant_id),
                )
                row = cur.fetchone()
                if row:
                    cur.execute(
                        """UPDATE products_priceoffer SET price=?, stock_status=?, url=?,
                        raw_price_text=?, date_updated=datetime('now') WHERE id=?""",
                        (price, stock, offer_url[:200], raw, row[0]),
                    )
                    offers_updated += 1
                else:
                    cur.execute(
                        """INSERT INTO products_priceoffer
                        (product_id, merchant_id, price, currency, raw_price_text, stock_status,
                        url, date_updated, approval_status, merchant_name, rejection_reason)
                        VALUES (?, ?, ?, 'MAD', ?, ?, ?, datetime('now'), 'approved', '', '')""",
                        (product_id, merchant_id, price, raw, stock, offer_url[:200]),
                    )
                    offers_created += 1

    conn.commit()
    cur.execute("SELECT COUNT(*) FROM products_priceoffer")
    after = cur.fetchone()[0]
    conn.close()
    print(
        f"Products created: {products_created}. "
        f"Offers created: {offers_created}, updated: {offers_updated}. "
        f"Total PriceOffer: {after}"
    )


if __name__ == "__main__":
    main()
