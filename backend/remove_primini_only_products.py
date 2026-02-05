#!/usr/bin/env python
"""
Script pour supprimer les produits qui ont seulement un lien primini.
Garde les produits qui ont un lien primini ET d'autres liens.
"""
import sqlite3
import sys
import os
from pathlib import Path

# Chemin vers la base de données
DB_PATH = Path(__file__).parent / 'db.sqlite3'


def is_primini_url(url):
    """Vérifie si une URL est un lien primini"""
    if not url:
        return False
    return 'primini.ma' in url.lower() or 'primini' in url.lower()


def find_products_with_only_primini(conn, dry_run=True):
    """Trouve les produits qui ont seulement des liens primini"""
    cursor = conn.cursor()
    
    # Récupérer tous les produits avec leurs offres
    cursor.execute("""
        SELECT 
            p.id,
            p.name,
            COUNT(po.id) as offer_count,
            SUM(CASE WHEN po.url LIKE '%primini%' OR po.url LIKE '%primini.ma%' THEN 1 ELSE 0 END) as primini_count
        FROM products_product p
        LEFT JOIN products_priceoffer po ON p.id = po.product_id
        GROUP BY p.id, p.name
        HAVING offer_count > 0
    """)
    
    products_to_delete = []
    
    for row in cursor.fetchall():
        product_id, product_name, offer_count, primini_count = row
        
        # Si le produit n'a que des liens primini (toutes les offres sont primini)
        if primini_count == offer_count and offer_count > 0:
            products_to_delete.append((product_id, product_name, offer_count, primini_count))
    
    return products_to_delete


def delete_products(conn, product_ids, dry_run=True):
    """Supprime les produits et leurs offres associées"""
    if dry_run:
        print(f"\n[DRY RUN] {len(product_ids)} produits seraient supprimes")
        return 0
    
    cursor = conn.cursor()
    deleted_count = 0
    
    # Supprimer les produits (les offres seront supprimées automatiquement via CASCADE)
    for product_id in product_ids:
        cursor.execute("DELETE FROM products_product WHERE id = ?", (product_id,))
        deleted_count += 1
        if deleted_count % 100 == 0:
            print(f"  Supprimé {deleted_count}/{len(product_ids)} produits...")
    
    conn.commit()
    return deleted_count


def main():
    dry_run = '--dry-run' in sys.argv or '-d' in sys.argv
    
    print('=' * 70)
    print('Suppression des produits avec seulement des liens primini')
    print('=' * 70)
    
    if dry_run:
        print('\n[MODE DRY RUN] - Aucune modification ne sera effectuee\n')
    
    if not DB_PATH.exists():
        print(f"[ERREUR] La base de donnees n'existe pas a {DB_PATH}")
        sys.exit(1)
    
    # Connexion à la base de données
    conn = sqlite3.connect(str(DB_PATH))
    
    try:
        # Trouver les produits à supprimer
        print('\n[Recherche] Produits avec seulement des liens primini...')
        products_to_delete = find_products_with_only_primini(conn, dry_run)
        
        if products_to_delete:
            print(f'\nTrouve {len(products_to_delete)} produits a supprimer:')
            
            # Afficher quelques exemples
            for i, (product_id, product_name, offer_count, primini_count) in enumerate(products_to_delete[:10], 1):
                print(
                    f'  {i}. {product_name} (ID: {product_id}) - '
                    f'{offer_count} offre(s), toutes primini'
                )
            
            if len(products_to_delete) > 10:
                print(f'  ... et {len(products_to_delete) - 10} autres produits')
            
            if not dry_run:
                confirm = input(f'\nSupprimer {len(products_to_delete)} produits? (yes/no): ').lower()
                if confirm == 'yes':
                    print('\n[Suppression] Produits en cours...')
                    product_ids = [p[0] for p in products_to_delete]
                    deleted_count = delete_products(conn, product_ids, dry_run=False)
                    print(f'\n[OK] {deleted_count} produits supprimes avec succes')
                else:
                    print('\n[ANNULE] Suppression annulee')
            else:
                print(
                    f'\n[DRY RUN] {len(products_to_delete)} produits seraient supprimes'
                )
        else:
            print('  [OK] Aucun produit avec seulement des liens primini trouve')
        
        # Statistiques finales
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM products_product")
        total_products = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(DISTINCT product_id) 
            FROM products_priceoffer
        """)
        products_with_offers = cursor.fetchone()[0]
        
        print('\n' + '=' * 70)
        if dry_run:
            print('DRY RUN TERMINE - Aucune modification n\'a ete effectuee')
        else:
            print('NETTOYAGE TERMINE')
        print('=' * 70)
        
        print(f'\nStatistiques finales:')
        print(f'  Total produits: {total_products}')
        print(f'  Produits avec offres: {products_with_offers}')
        
    finally:
        conn.close()


if __name__ == '__main__':
    main()
