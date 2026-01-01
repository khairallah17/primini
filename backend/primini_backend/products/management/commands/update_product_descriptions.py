import json
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from primini_backend.products.models import Product
from difflib import SequenceMatcher


def normalize_string(s):
    """Normalize string for comparison"""
    if not s:
        return ""
    return s.lower().strip()


def similarity(a, b):
    """Calculate similarity between two strings (0-1)"""
    return SequenceMatcher(None, normalize_string(a), normalize_string(b)).ratio()


class Command(BaseCommand):
    help = 'Update product descriptions from scraped JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            'json_file',
            type=str,
            help='Path to the JSON file containing scraped product data',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )
        parser.add_argument(
            '--similarity-threshold',
            type=float,
            default=0.85,
            help='Similarity threshold for matching products by name (0-1, default: 0.85)',
        )
        parser.add_argument(
            '--min-description-length',
            type=int,
            default=50,
            help='Minimum description length to update (default: 50)',
        )
        parser.add_argument(
            '--force-replace',
            action='store_true',
            help='Force replace descriptions even if they are the same (default: False)',
        )

    def load_json_data(self, json_file):
        """Load and extract products from JSON file"""
        self.stdout.write(f'Loading JSON file: {json_file}')
        
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Products are at the top level
        products = data.get('products', [])
        
        self.stdout.write(f'Found {len(products)} products in JSON file')
        return products

    def find_product_match(self, json_product, threshold=0.85):
        """Find matching product in database"""
        json_name = json_product.get('name', '').strip()
        json_slug = json_product.get('slug', '').strip()
        
        if not json_name:
            return None
        
        # Try exact match by slug first (from JSON)
        if json_slug:
            try:
                product = Product.objects.get(slug=json_slug)
                return product
            except Product.DoesNotExist:
                pass
            except Product.MultipleObjectsReturned:
                # If multiple products with same slug, return the first one
                return Product.objects.filter(slug=json_slug).first()
        
        # Try matching by slugified name
        product_slug = slugify(json_name)
        try:
            product = Product.objects.get(slug=product_slug)
            return product
        except Product.DoesNotExist:
            pass
        except Product.MultipleObjectsReturned:
            # If multiple products with same slug, try to match by name
            products = Product.objects.filter(slug=product_slug)
            for p in products:
                if similarity(p.name, json_name) >= threshold:
                    return p
        
        # Try matching by name similarity
        all_products = Product.objects.all()
        best_match = None
        best_similarity = 0
        
        for product in all_products:
            sim = similarity(product.name, json_name)
            if sim >= threshold and sim > best_similarity:
                best_similarity = sim
                best_match = product
        
        return best_match

    @transaction.atomic
    def handle(self, *args, **options):
        json_file = options['json_file']
        dry_run = options['dry_run']
        threshold = options['similarity_threshold']
        min_length = options['min_description_length']
        force_replace = options.get('force_replace', False)
        
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('Product Description Update Tool'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN MODE - No changes will be made\n'))
        
        # Load JSON data
        try:
            json_products = self.load_json_data(json_file)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'File not found: {json_file}'))
            return
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'Invalid JSON file: {e}'))
            return
        
        # Statistics
        stats = {
            'matched': 0,
            'updated': 0,
            'replaced': 0,  # Products that had descriptions replaced
            'skipped_no_description': 0,
            'skipped_too_short': 0,
            'not_found': 0,
        }
        
        # Process each product
        self.stdout.write(f'\n📋 Processing products...')
        
        for idx, json_product in enumerate(json_products, 1):
            if idx % 100 == 0:
                self.stdout.write(f'  Processed {idx}/{len(json_products)} products...')
            
            json_name = json_product.get('name', '').strip()
            json_description = json_product.get('description', '').strip()
            
            if not json_name:
                continue
            
            # Skip if no description or too short
            if not json_description:
                stats['skipped_no_description'] += 1
                continue
            
            if len(json_description) < min_length:
                stats['skipped_too_short'] += 1
                continue
            
            # Find matching product by name from JSON
            product = self.find_product_match(json_product, threshold)
            
            if not product:
                stats['not_found'] += 1
                continue
            
            stats['matched'] += 1
            
            # Always erase old description and replace with new one from JSON
            # Store old description for logging
            old_description = product.description or ''
            had_old_description = bool(old_description)
            
            # Update description - always replace regardless of existing content
            if not dry_run:
                product.description = json_description
                product.save(update_fields=['description'])
            
            stats['updated'] += 1
            if had_old_description:
                stats['replaced'] += 1
            
            # Log if description was changed (for dry-run or verbose output)
            if idx <= 10:  # Show first 10 changes
                if had_old_description:
                    self.stdout.write(f'  ✓ Replaced: {json_name[:50]}... (old: {len(old_description)} chars → new: {len(json_description)} chars)')
                else:
                    self.stdout.write(f'  ✓ Added: {json_name[:50]}... ({len(json_description)} chars)')
            
            if not dry_run and stats['updated'] % 50 == 0:
                self.stdout.write(f'  Updated {stats["updated"]} products...')
        
        # Summary
        self.stdout.write('\n' + '=' * 70)
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN COMPLETE - No changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS('UPDATE COMPLETE'))
        self.stdout.write('=' * 70)
        
        self.stdout.write(f'\n📊 Statistics:')
        self.stdout.write(f'  Products in JSON: {len(json_products)}')
        self.stdout.write(f'  Matched products: {stats["matched"]}')
        self.stdout.write(f'  Updated/Replaced: {stats["updated"]}')
        self.stdout.write(f'  Descriptions replaced: {stats["replaced"]}')
        self.stdout.write(f'  Skipped (no description in JSON): {stats["skipped_no_description"]}')
        self.stdout.write(f'  Skipped (too short): {stats["skipped_too_short"]}')
        self.stdout.write(f'  Not found in database: {stats["not_found"]}')

