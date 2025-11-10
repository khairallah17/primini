import json
import os
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from primini_backend.products.models import Category, Merchant, Product, PriceOffer


class Command(BaseCommand):
    help = 'Import products and offers from JSON files'

    def add_arguments(self, parser):
        parser.add_argument(
            'data_dir',
            type=str,
            help='Path to the directory containing the offers data'
        )

    def handle(self, *args, **options):
        data_dir = Path(options['data_dir'])
        
        if not data_dir.exists():
            self.stdout.write(self.style.ERROR(f'Directory not found: {data_dir}'))
            return

        self.stdout.write(self.style.SUCCESS('Starting import...'))
        
        # Category mapping
        category_mapping = {
            'electromenager_with_offers': 'Électroménager',
            'image_et_son_with_offers': 'Image et Son',
            'informatique_with_offers': 'Informatique',
            'petit_electromenager_with_offers': 'Petit Électroménager',
            'photo_camera_with_offers': 'Photo et Caméra',
            'sante_beaute_with_offers': 'Santé et Beauté',
            'telephonie_with_offers': 'Téléphonie',
        }
        
        # Subcategory mapping (for nested folders)
        subcategory_mapping = {
            'composants_with_offers': 'Composants PC',
            'ordinateurs_with_offers': 'Ordinateurs',
            'peripheriques_with_offers': 'Périphériques',
            'reseaux_with_offers': 'Réseaux',
            'stockages_with_offers': 'Stockage',
            'accessoires_with_offers': 'Accessoires',
        }
        
        stats = {
            'categories': 0,
            'products': 0,
            'merchants': 0,
            'offers': 0,
        }

        with transaction.atomic():
            # Process each main category directory
            for category_dir in data_dir.iterdir():
                if not category_dir.is_dir():
                    continue
                
                category_name = category_mapping.get(category_dir.name, category_dir.name.replace('_', ' ').title())
                category, created = Category.objects.get_or_create(
                    slug=slugify(category_name),
                    defaults={'name': category_name}
                )
                if created:
                    stats['categories'] += 1
                    self.stdout.write(f'Created category: {category_name}')
                
                # Process subcategories or direct JSON files
                self.process_directory(category_dir, category, subcategory_mapping, stats)
        
        self.stdout.write(self.style.SUCCESS(
            f'\nImport completed successfully!\n'
            f'Categories: {stats["categories"]}\n'
            f'Products: {stats["products"]}\n'
            f'Merchants: {stats["merchants"]}\n'
            f'Offers: {stats["offers"]}'
        ))

    def process_directory(self, directory, parent_category, subcategory_mapping, stats):
        """Process a directory that may contain subcategories or JSON files"""
        
        # Check if this directory has subdirectories (subcategories)
        subdirs = [d for d in directory.iterdir() if d.is_dir()]
        
        if subdirs:
            # Process subcategories
            for subdir in subdirs:
                subcategory_name = subcategory_mapping.get(
                    subdir.name,
                    subdir.name.replace('_', ' ').title()
                )
                subcategory, created = Category.objects.get_or_create(
                    slug=slugify(subcategory_name),
                    defaults={
                        'name': subcategory_name,
                        'parent': parent_category
                    }
                )
                if created:
                    stats['categories'] += 1
                    self.stdout.write(f'  Created subcategory: {subcategory_name}')
                
                # Process JSON files in subcategory
                self.process_json_files(subdir, subcategory, stats)
        else:
            # Process JSON files directly in this directory
            self.process_json_files(directory, parent_category, stats)

    def process_json_files(self, directory, category, stats):
        """Process all JSON files in a directory"""
        
        for json_file in directory.glob('*.json'):
            self.stdout.write(f'  Processing: {json_file.name}')
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    products_data = json.load(f)
                
                for product_data in products_data:
                    self.import_product(product_data, category, stats)
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'    Error processing {json_file.name}: {e}'))

    def import_product(self, data, category, stats):
        """Import a single product and its offers"""
        
        try:
            # Extract brand from product name (usually first word)
            name = data.get('name', '')
            brand = name.split()[0] if name else 'Unknown'
            
            # Create or get product
            product_slug = slugify(name[:200])  # Limit slug length
            defaults = {
                'name': name,
                'category': category,
                'brand': brand,
                'image': data.get('image', ''),
                'description': f"Prix à partir de {data.get('price', 0)} MAD",
                'source_category': data.get('category_name', category.name if category else ''),
                'raw_price_map': data.get('raw_price_map', {}) or {},
                'raw_url_map': data.get('raw_url_map', {}) or {},
            }
            product, created = Product.objects.update_or_create(
                slug=product_slug,
                defaults=defaults,
            )
            
            if created:
                stats['products'] += 1
            
            # Import offers
            for offer_data in data.get('offers_details', []):
                self.import_offer(product, offer_data, stats)
        
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'    Error importing product {data.get("name", "unknown")}: {e}'))

    def import_offer(self, product, offer_data, stats):
        """Import a single offer for a product"""
        
        try:
            # Create or get merchant
            merchant_name = offer_data.get('store_name', 'Unknown')
            merchant_slug = slugify(merchant_name)
            
            merchant, created = Merchant.objects.get_or_create(
                name=merchant_name,
                defaults={
                    'website': offer_data.get('store_url', ''),
                }
            )
            
            if created:
                stats['merchants'] += 1
            
            # Determine stock status
            stock = offer_data.get('stock')
            stock_status = 'in_stock'
            if stock and 'rupture' in str(stock).lower():
                stock_status = 'out_of_stock'
            elif stock and ('faible' in str(stock).lower() or 'peu' in str(stock).lower()):
                stock_status = 'low_stock'
            
            # Create or update offer
            price = float(offer_data.get('price', 0))
            offer_url = offer_data.get('offer_url', '')
            
            defaults = {
                'price': price,
                'stock_status': stock_status,
                'url': offer_url,
                'currency': offer_data.get('currency', 'MAD'),
                'raw_price_text': str(offer_data.get('price', '')),
            }

            offer, created = PriceOffer.objects.update_or_create(
                product=product,
                merchant=merchant,
                defaults=defaults
            )
            
            if created:
                stats['offers'] += 1
        
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'      Error importing offer: {e}'))

