#!/usr/bin/env python
"""
Script pour supprimer les champs 'primini' des raw_price_map et raw_url_map
de tous les produits dans la base de données.
"""
import sqlite3
import sys
import json
from pathlib import Path

# Chemin vers la base de données
DB_PATH = Path(__file__).parent / 'db.sqlite3'


def remove_primini_from_map(data_map):
    """Supprime 'primini' d'une liste ou d'un dictionnaire (raw_price_map ou raw_url_map)"""
    if not data_map:
        return data_map
    
    # Si c'est une liste, supprimer les éléments contenant 'primini'
    if isinstance(data_map, list):
        cleaned_list = [item for item in data_map if 'primini' not in str(item).lower()]
        return cleaned_list
    
    # Si c'est un dictionnaire, supprimer les clés contenant 'primini'
    if isinstance(data_map, dict):
        cleaned_map = {}
        for key, value in data_map.items():
            if 'primini' not in str(key).lower():
                cleaned_map[key] = value
        return cleaned_map
    
    return data_map


def process_products(conn, dry_run=True):
    """Traite tous les produits pour supprimer 'primini' des maps"""
    cursor = conn.cursor()
    
    # Récupérer tous les produits avec leurs raw_price_map et raw_url_map
    cursor.execute("""
        SELECT id, name, raw_price_map, raw_url_map
        FROM products_product
        WHERE raw_price_map IS NOT NULL 
           OR raw_url_map IS NOT NULL
    """)
    
    products_to_update = []
    total_primini_removed = 0
    
    for row in cursor.fetchall():
        product_id, product_name, raw_price_map_json, raw_url_map_json = row
        
        price_map_changed = False
        url_map_changed = False
        
        # Traiter raw_price_map
        price_map = None
        if raw_price_map_json:
            try:
                price_map = json.loads(raw_price_map_json) if isinstance(raw_price_map_json, str) else raw_price_map_json
                # Vérifier si 'primini' est présent (dans les clés si dict, dans les éléments si list)
                has_primini = False
                if isinstance(price_map, list):
                    has_primini = any('primini' in str(item).lower() for item in price_map)
                elif isinstance(price_map, dict):
                    has_primini = any('primini' in str(key).lower() for key in price_map.keys())
                
                if has_primini:
                    original_length = len(price_map) if isinstance(price_map, (list, dict)) else 0
                    price_map = remove_primini_from_map(price_map)
                    new_length = len(price_map) if isinstance(price_map, (list, dict)) else 0
                    if original_length != new_length:
                        price_map_changed = True
                        total_primini_removed += (original_length - new_length)
            except (json.JSONDecodeError, TypeError) as e:
                # Si le JSON est invalide, on passe
                pass
        
        # Traiter raw_url_map
        url_map = None
        if raw_url_map_json:
            try:
                url_map = json.loads(raw_url_map_json) if isinstance(raw_url_map_json, str) else raw_url_map_json
                # Vérifier si 'primini' est présent (dans les clés si dict, dans les éléments si list)
                has_primini = False
                if isinstance(url_map, list):
                    has_primini = any('primini' in str(item).lower() for item in url_map)
                elif isinstance(url_map, dict):
                    has_primini = any('primini' in str(key).lower() for key in url_map.keys())
                
                if has_primini:
                    original_length = len(url_map) if isinstance(url_map, (list, dict)) else 0
                    url_map = remove_primini_from_map(url_map)
                    new_length = len(url_map) if isinstance(url_map, (list, dict)) else 0
                    if original_length != new_length:
                        url_map_changed = True
                        total_primini_removed += (original_length - new_length)
            except (json.JSONDecodeError, TypeError) as e:
                # Si le JSON est invalide, on passe
                pass
        
        # Si au moins un map a été modifié, ajouter à la liste
        if price_map_changed or url_map_changed:
            products_to_update.append({
                'id': product_id,
                'name': product_name,
                'price_map': price_map,
                'url_map': url_map,
                'price_changed': price_map_changed,
                'url_changed': url_map_changed
            })
    
    return products_to_update, total_primini_removed


def update_products(conn, products_to_update, dry_run=True):
    """Met à jour les produits dans la base de données"""
    if dry_run:
        print(f"\n[DRY RUN] {len(products_to_update)} produits seraient mis a jour")
        return 0
    
    cursor = conn.cursor()
    updated_count = 0
    
    for product in products_to_update:
        # Sérialiser les maps en JSON
        # Toujours sérialiser, même si vide (utiliser [] pour liste vide, {} pour dict vide)
        if product['price_map'] is None:
            price_map_json = '[]'  # Par défaut, utiliser une liste vide
        else:
            price_map_json = json.dumps(product['price_map'])
        
        if product['url_map'] is None:
            url_map_json = '[]'  # Par défaut, utiliser une liste vide
        else:
            url_map_json = json.dumps(product['url_map'])
        
        # Mettre à jour la base de données
        cursor.execute("""
            UPDATE products_product
            SET raw_price_map = ?,
                raw_url_map = ?
            WHERE id = ?
        """, (price_map_json, url_map_json, product['id']))
        
        updated_count += 1
        if updated_count % 100 == 0:
            print(f"  Mis a jour {updated_count}/{len(products_to_update)} produits...")
    
    conn.commit()
    return updated_count


def main():
    dry_run = '--dry-run' in sys.argv or '-d' in sys.argv
    
    print('=' * 70)
    print('Suppression des champs primini des raw_price_map et raw_url_map')
    print('=' * 70)
    
    if dry_run:
        print('\n[MODE DRY RUN] - Aucune modification ne sera effectuee\n')
    
    if not DB_PATH.exists():
        print(f"[ERREUR] La base de donnees n'existe pas a {DB_PATH}")
        sys.exit(1)
    
    # Connexion à la base de données
    conn = sqlite3.connect(str(DB_PATH))
    
    try:
        # Traiter les produits
        print('\n[Recherche] Produits avec raw_price_map ou raw_url_map contenant primini...')
        products_to_update, total_primini_removed = process_products(conn, dry_run)
        
        if products_to_update:
            print(f'\nTrouve {len(products_to_update)} produits a mettre a jour:')
            print(f'Total de champs primini a supprimer: {total_primini_removed}')
            
            # Afficher quelques exemples
            for i, product in enumerate(products_to_update[:10], 1):
                changes = []
                if product['price_changed']:
                    changes.append('raw_price_map')
                if product['url_changed']:
                    changes.append('raw_url_map')
                print(
                    f'  {i}. {product["name"]} (ID: {product["id"]}) - '
                    f'Modifie: {", ".join(changes)}'
                )
            
            if len(products_to_update) > 10:
                print(f'  ... et {len(products_to_update) - 10} autres produits')
            
            if not dry_run:
                confirm = input(f'\nMettre a jour {len(products_to_update)} produits? (yes/no): ').lower()
                if confirm == 'yes':
                    print('\n[Mise a jour] Produits en cours...')
                    updated_count = update_products(conn, products_to_update, dry_run=False)
                    print(f'\n[OK] {updated_count} produits mis a jour avec succes')
                    print(f'[OK] {total_primini_removed} champs primini supprimes')
                else:
                    print('\n[ANNULE] Mise a jour annulee')
            else:
                print(
                    f'\n[DRY RUN] {len(products_to_update)} produits seraient mis a jour'
                )
                print(f'[DRY RUN] {total_primini_removed} champs primini seraient supprimes')
        else:
            print('  [OK] Aucun produit avec primini dans les maps trouve')
        
        # Statistiques finales
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM products_product")
        total_products = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(*) 
            FROM products_product
            WHERE raw_price_map IS NOT NULL OR raw_url_map IS NOT NULL
        """)
        products_with_maps = cursor.fetchone()[0]
        
        print('\n' + '=' * 70)
        if dry_run:
            print('DRY RUN TERMINE - Aucune modification n\'a ete effectuee')
        else:
            print('NETTOYAGE TERMINE')
        print('=' * 70)
        
        print(f'\nStatistiques finales:')
        print(f'  Total produits: {total_products}')
        print(f'  Produits avec maps: {products_with_maps}')
        
    finally:
        conn.close()


if __name__ == '__main__':
    main()
