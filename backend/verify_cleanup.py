#!/usr/bin/env python
"""Script de vérification après le nettoyage"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / 'db.sqlite3'

conn = sqlite3.connect(str(DB_PATH))
cursor = conn.cursor()

# Total produits
cursor.execute("SELECT COUNT(*) FROM products_product")
total_products = cursor.fetchone()[0]
print(f"Total produits: {total_products}")

# Produits avec offres
cursor.execute("SELECT COUNT(DISTINCT product_id) FROM products_priceoffer")
products_with_offers = cursor.fetchone()[0]
print(f"Produits avec offres: {products_with_offers}")

# Produits qui ont un lien primini ET d'autres liens
cursor.execute("""
    SELECT COUNT(DISTINCT p.id)
    FROM products_product p
    JOIN products_priceoffer po ON p.id = po.product_id
    WHERE p.id IN (
        SELECT product_id
        FROM products_priceoffer
        GROUP BY product_id
        HAVING COUNT(*) > 1
    )
    AND p.id IN (
        SELECT DISTINCT product_id
        FROM products_priceoffer
        WHERE url LIKE '%primini%' OR url LIKE '%primini.ma%'
    )
""")
products_with_primini_and_others = cursor.fetchone()[0]
print(f"Produits avec primini ET autres liens (conserves): {products_with_primini_and_others}")

# Produits qui n'ont QUE des liens primini (ne devraient plus exister)
cursor.execute("""
    SELECT COUNT(DISTINCT p.id)
    FROM products_product p
    JOIN products_priceoffer po ON p.id = po.product_id
    WHERE p.id NOT IN (
        SELECT product_id
        FROM products_priceoffer
        WHERE url NOT LIKE '%primini%' AND url NOT LIKE '%primini.ma%'
        GROUP BY product_id
    )
    AND p.id IN (
        SELECT DISTINCT product_id
        FROM products_priceoffer
        WHERE url LIKE '%primini%' OR url LIKE '%primini.ma%'
    )
""")
products_only_primini = cursor.fetchone()[0]
print(f"Produits avec SEULEMENT primini (devrait etre 0): {products_only_primini}")

conn.close()
