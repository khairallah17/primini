import json
import re
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from primini_backend.products.models import Category, Merchant, Product, PriceOffer


class Command(BaseCommand):
    help = 'Import products from products_restructured.json file'

    def add_arguments(self, parser):
        parser.add_argument(
            'json_file',
            type=str,
            help='Path to the products_restructured.json file'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing products before importing'
        )

    def handle(self, *args, **options):
        json_file_path = Path(options['json_file'])
        
        if not json_file_path.exists():
            self.stdout.write(self.style.ERROR(f'File not found: {json_file_path}'))
            return

        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing products...'))
            Product.objects.all().delete()
            PriceOffer.objects.all().delete()
            Merchant.objects.all().delete()
            Category.objects.all().delete()

        self.stdout.write(self.style.SUCCESS('Starting import...'))
        
        stats = {
            'categories': 0,
            'products': 0,
            'merchants': 0,
            'offers': 0,
        }

        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            products_data = data.get('products', [])
            
            if not products_data:
                self.stdout.write(self.style.ERROR('No products found in JSON file'))
                return

            with transaction.atomic():
                for i, product_data in enumerate(products_data):
                    if i % 100 == 0:
                        self.stdout.write(f'Processing product {i+1}/{len(products_data)}...')
                    
                    try:
                        self.import_product(product_data, stats)
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'Error importing product {i+1}: {e}'))
                        continue

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error reading JSON file: {e}'))
            return

        self.stdout.write(self.style.SUCCESS(
            f'\nImport completed successfully!\n'
            f'Categories: {stats["categories"]}\n'
            f'Products: {stats["products"]}\n'
            f'Merchants: {stats["merchants"]}\n'
            f'Offers: {stats["offers"]}'
        ))

    def import_product(self, data, stats):
        """Import a single product and its offers"""
        
        try:
            # Extract product information
            name = data.get('name', '').strip()
            if not name:
                return
            
            # Extract brand from product name (usually first word)
            brand = name.split()[0] if name else 'Unknown'
            
            # Get category
            category_name = data.get('category', 'Autres')
            category, created = Category.objects.get_or_create(
                slug=slugify(category_name),
                defaults={'name': category_name}
            )
            if created:
                stats['categories'] += 1
            
            # Create or get product
            product_slug = slugify(name[:200])  # Limit slug length
            product, created = Product.objects.get_or_create(
                slug=product_slug,
                defaults={
                    'name': name,
                    'category': category,
                    'brand': brand,
                    'image': data.get('image_url', ''),
                    'description': data.get('description', ''),
                }
            )
            
            if created:
                stats['products'] += 1
            
            # Import offers from price and url dictionaries
            self.import_offers_from_dict(product, data, stats)
        
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Error importing product {data.get("name", "unknown")}: {e}'))

    def import_offers_from_dict(self, product, data, stats):
        """Import offers from price and url dictionaries"""
        
        prices = data.get('price', {})
        urls = data.get('url', {})
        
        # Get all merchant names from both dictionaries
        merchant_names = set(prices.keys()) | set(urls.keys())
        
        for merchant_name in merchant_names:
            try:
                # Parse price - remove currency symbols and convert to float
                price_str = prices.get(merchant_name, '0')
                price = self.parse_price(price_str)
                
                if price <= 0:
                    continue  # Skip invalid prices
                
                # Get URL
                offer_url = urls.get(merchant_name, '')
                
                # Create or get merchant
                merchant, created = Merchant.objects.get_or_create(
                    name=merchant_name,
                    defaults={
                        'website': self.extract_domain(offer_url),
                    }
                )
                
                if created:
                    stats['merchants'] += 1
                
                # Create or update offer
                offer, created = PriceOffer.objects.update_or_create(
                    product=product,
                    merchant=merchant,
                    defaults={
                        'price': price,
                        'stock_status': 'in_stock',  # Default to in stock
                        'url': offer_url,
                    }
                )
                
                if created:
                    stats['offers'] += 1
            
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error importing offer for {merchant_name}: {e}'))

    def parse_price(self, price_str):
        """Parse price string and convert to float"""
        if not price_str:
            return 0.0
        
        # Remove currency symbols and spaces
        price_clean = re.sub(r'[^\d.,]', '', str(price_str))
        
        # Handle different decimal separators
        if ',' in price_clean and '.' in price_clean:
            # Both comma and dot present - assume comma is thousands separator
            price_clean = price_clean.replace(',', '')
        elif ',' in price_clean:
            # Only comma - could be decimal separator or thousands separator
            # If more than 2 digits after comma, treat as thousands separator
            parts = price_clean.split(',')
            if len(parts) == 2 and len(parts[1]) > 2:
                price_clean = price_clean.replace(',', '')
            else:
                price_clean = price_clean.replace(',', '.')
        
        try:
            return float(price_clean)
        except ValueError:
            return 0.0

    def extract_domain(self, url):
        """Extract domain from URL"""
        if not url:
            return ''
        
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return f"{parsed.scheme}://{parsed.netloc}"
        except:
            return ''
