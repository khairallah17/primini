from django.core.management.base import BaseCommand
from django.db import transaction
from primini_backend.products.models import Product
import re


def parse_price_to_int(price_value):
    """Convert price value to integer, handling various formats correctly"""
    if price_value is None:
        return None
    
    # If already an integer, return it
    if isinstance(price_value, int):
        return price_value
    
    # If it's a float, convert to int (round to nearest)
    if isinstance(price_value, float):
        return int(round(price_value))
    
    # If it's a string, try to extract number
    if isinstance(price_value, str):
        # Remove common currency symbols and text
        price_str = price_value.replace('MAD', '').replace('DH', '').replace('TTC', '').replace('€', '').replace('$', '')
        price_str = price_str.strip()
        
        # Remove all spaces (including non-breaking spaces)
        price_str = price_str.replace(' ', '').replace('\u00a0', '').replace('\xa0', '')
        
        # Handle European number format
        # Examples: 
        # - "899,00" -> 899 (comma is decimal separator)
        # - "12.290,00" -> 12290 (dot is thousands, comma is decimal)
        # - "1.490,00" -> 1490 (dot is thousands, comma is decimal)
        # - "2 219,00" -> 2219 (space is thousands, comma is decimal)
        
        if ',' in price_str:
            # European format: comma is decimal separator
            parts = price_str.split(',')
            integer_part = parts[0]
            
            # Remove dots and spaces (thousands separators) from integer part
            integer_part = integer_part.replace('.', '').replace(' ', '')
            
            try:
                # Parse integer part (ignore decimal part for integer conversion)
                return int(integer_part)
            except ValueError:
                pass
        elif '.' in price_str:
            # Could be thousands separator or decimal separator
            # Check if it looks like thousands (multiple dots or last part > 2 digits)
            parts = price_str.split('.')
            
            if len(parts) > 2:
                # Multiple dots = thousands separator: "12.290.500"
                try:
                    return int(price_str.replace('.', ''))
                except ValueError:
                    pass
            elif len(parts) == 2:
                # Single dot - check if decimal or thousands
                if len(parts[1]) <= 2:
                    # Likely decimal: "12.50" or "12.5"
                    try:
                        return int(round(float(price_str)))
                    except ValueError:
                        pass
                else:
                    # Likely thousands: "12.290"
                    try:
                        return int(price_str.replace('.', ''))
                    except ValueError:
                        pass
        
        # Fallback: try to extract number pattern
        # Look for number with optional thousands separators
        # Pattern: digits with optional dots/spaces as separators
        match = re.search(r'[\d\s\.]+', price_str)
        if match:
            num_str = match.group().replace(' ', '').replace('.', '')
            try:
                return int(num_str)
            except ValueError:
                pass
        
        # Last resort: extract all digits, but be careful with European format
        # If we see a pattern like "2219,00" we should not concatenate all digits
        # Instead, only take digits before comma if comma exists
        if ',' in price_str:
            # Take only digits before comma
            before_comma = price_str.split(',')[0]
            digits = re.sub(r'[^\d]', '', before_comma)
            if digits:
                try:
                    return int(digits)
                except ValueError:
                    pass
        else:
            # No comma, extract all digits
            digits = re.sub(r'[^\d]', '', price_str)
            if digits:
                try:
                    return int(digits)
                except ValueError:
                    pass
    
    return None


def format_price_value(price_value):
    """Format a price value (can be single value or array) to integer(s)"""
    if price_value is None:
        return None
    
    # If it's a list/array, format each element
    if isinstance(price_value, list):
        formatted_list = []
        for item in price_value:
            formatted = parse_price_to_int(item)
            if formatted is not None:
                formatted_list.append(formatted)
        return formatted_list if formatted_list else None
    
    # Single value
    return parse_price_to_int(price_value)


class Command(BaseCommand):
    help = 'Format prices in raw_price_map to integer values'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit the number of products to process (for testing)',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']
        
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('Raw Price Map Formatting Tool'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN MODE - No changes will be made\n'))
        
        # Get products with raw_price_map
        queryset = Product.objects.filter(
            raw_price_map__isnull=False
        ).exclude(raw_price_map={})
        
        if limit:
            queryset = queryset[:limit]
        
        total_products = queryset.count()
        self.stdout.write(f'\nFound {total_products} products with raw_price_map')
        
        stats = {
            'processed': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0,
        }
        
        self.stdout.write(f'\n📋 Processing products...')
        
        for idx, product in enumerate(queryset, 1):
            if idx % 100 == 0:
                self.stdout.write(f'  Processed {idx}/{total_products} products...')
            
            try:
                raw_price_map = product.raw_price_map
                if not raw_price_map or not isinstance(raw_price_map, dict):
                    stats['skipped'] += 1
                    continue
                
                # Check if update is needed
                needs_update = False
                formatted_map = {}
                
                for site, price_value in raw_price_map.items():
                    # Handle already-formatted integers that might be incorrect
                    if isinstance(price_value, int):
                        # Check if price might be incorrectly formatted
                        # Pattern: prices ending in 00 that are very large might be wrong
                        # e.g., 221900 instead of 2219 (from "2 219,00")
                        if price_value > 10000 and price_value % 100 == 0:
                            # Check if dividing by 100 gives a more reasonable price
                            corrected = price_value // 100
                            # Heuristic: if corrected price is between 1 and 100000, it's likely correct
                            if 1 <= corrected <= 100000:
                                # Check if the last 2 digits of original were "00"
                                # This suggests it was incorrectly parsed from "X,00" format
                                formatted_map[site] = corrected
                                if corrected != price_value:
                                    needs_update = True
                            else:
                                formatted_map[site] = price_value
                        else:
                            formatted_map[site] = price_value
                    else:
                        # Format the price value from string/other format
                        formatted_price = format_price_value(price_value)
                        formatted_map[site] = formatted_price
                        
                        # Check if price was changed
                        if formatted_price != price_value:
                            needs_update = True
                
                if needs_update:
                    stats['updated'] += 1
                    
                    if not dry_run:
                        product.raw_price_map = formatted_map
                        product.save(update_fields=['raw_price_map'])
                    
                    if stats['updated'] % 50 == 0 and not dry_run:
                        self.stdout.write(f'  Updated {stats["updated"]} products...')
                
                stats['processed'] += 1
                
            except Exception as e:
                stats['errors'] += 1
                self.stdout.write(
                    self.style.ERROR(f'  Error processing product {product.id} ({product.name}): {e}')
                )
        
        # Summary
        self.stdout.write('\n' + '=' * 70)
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN COMPLETE - No changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS('FORMATTING COMPLETE'))
        self.stdout.write('=' * 70)
        
        self.stdout.write(f'\n📊 Statistics:')
        self.stdout.write(f'  Total products processed: {stats["processed"]}')
        self.stdout.write(f'  Products updated: {stats["updated"]}')
        self.stdout.write(f'  Products skipped: {stats["skipped"]}')
        self.stdout.write(f'  Errors: {stats["errors"]}')

