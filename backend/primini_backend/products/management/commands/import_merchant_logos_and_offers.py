import json
import os
import shutil
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from primini_backend.products.models import Product, Merchant, PriceOffer
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Import merchant logos and update offers from scraped JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            'json_file',
            type=str,
            help='Path to the scraped JSON file'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making changes to the database'
        )
        parser.add_argument(
            '--copy-files',
            action='store_true',
            help='Copy logo files from newscraping/merchants to merchants/ directory'
        )

    def handle(self, *args, **options):
        json_file = options['json_file']
        dry_run = options['dry_run']
        copy_files = options['copy_files']

        if not os.path.exists(json_file):
            self.stdout.write(self.style.ERROR(f'JSON file not found: {json_file}'))
            return

        self.stdout.write(f'Reading JSON file: {json_file}')
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error reading JSON file: {e}'))
            return

        # Get merchants and products from JSON
        merchants_data = data.get('merchants', [])
        products_data = data.get('products', [])

        if not merchants_data and not products_data:
            self.stdout.write(self.style.WARNING('No merchants or products found in JSON file'))
            return

        self.stdout.write(f'Found {len(merchants_data)} merchants and {len(products_data)} products in JSON file')

        stats = {
            'merchants_processed': 0,
            'merchants_updated': 0,
            'logos_copied': 0,
            'products_processed': 0,
            'offers_deleted': 0,
            'offers_created': 0,
            'errors': 0
        }

        # Ensure merchants directory exists
        merchants_dir = os.path.join(settings.MEDIA_ROOT, 'merchants')
        os.makedirs(merchants_dir, exist_ok=True)

        # Process merchants and update logos
        if merchants_data:
            self.stdout.write('\nProcessing merchants...')
            for merchant_data in merchants_data:
                stats['merchants_processed'] += 1
                merchant_name = merchant_data.get('name')
                logo_info = merchant_data.get('logo', {})
                website = merchant_data.get('website', '')

                if not merchant_name:
                    continue

                # Get or create merchant
                try:
                    merchant, created = Merchant.objects.get_or_create(
                        name=merchant_name,
                        defaults={'website': website}
                    )
                    
                    if not created:
                        # Update website if provided
                        if website and not merchant.website:
                            merchant.website = website
                            if not dry_run:
                                merchant.save()

                    # Process logo
                    if logo_info and isinstance(logo_info, dict):
                        local_path = logo_info.get('local_path', '')
                        original_url = logo_info.get('url', '')
                        filename = logo_info.get('filename', '')

                        if local_path:
                            # Convert local_path to absolute file path
                            if local_path.startswith('/media/'):
                                relative_path = local_path.replace('/media/', '')
                                source_path = os.path.join(settings.MEDIA_ROOT, relative_path)
                            elif local_path.startswith('media/'):
                                source_path = os.path.join(settings.MEDIA_ROOT, local_path.replace('media/', ''))
                            else:
                                source_path = os.path.join(settings.MEDIA_ROOT, local_path.lstrip('/'))

                            # Check if source file exists
                            if os.path.exists(source_path):
                                # Determine target filename
                                target_filename = filename if filename else os.path.basename(source_path)
                                if not target_filename:
                                    target_filename = f'{slugify(merchant_name)}.webp'
                                
                                target_path = os.path.join(merchants_dir, target_filename)

                                # Copy file to merchants directory if copy_files is enabled
                                if copy_files:
                                    if not os.path.exists(target_path) or os.path.getmtime(source_path) > os.path.getmtime(target_path):
                                        if not dry_run:
                                            try:
                                                shutil.copy2(source_path, target_path)
                                                stats['logos_copied'] += 1
                                            except Exception as e:
                                                self.stdout.write(self.style.WARNING(
                                                    f'Could not copy logo file {source_path} to {target_path}: {e}'
                                                ))
                                        else:
                                            stats['logos_copied'] += 1
                                    
                                    if os.path.exists(target_path):
                                        # Update merchant with logo file
                                        if not dry_run:
                                            merchant.logo_file = f'merchants/{target_filename}'
                                            if original_url and original_url.startswith('http'):
                                                merchant.logo = original_url
                                            merchant.save()
                                        stats['merchants_updated'] += 1
                                else:
                                    # Just update the URL if not copying files
                                    if not dry_run:
                                        if original_url and original_url.startswith('http'):
                                            merchant.logo = original_url
                                            merchant.save()
                                        stats['merchants_updated'] += 1
                            else:
                                self.stdout.write(self.style.WARNING(
                                    f'Logo file not found: {source_path} (merchant: {merchant_name})'
                                ))
                        elif original_url and original_url.startswith('http'):
                            # Update with URL only
                            if not dry_run:
                                merchant.logo = original_url
                                merchant.save()
                            stats['merchants_updated'] += 1

                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f'Error processing merchant {merchant_name}: {e}'
                    ))
                    stats['errors'] += 1

                if stats['merchants_processed'] % 10 == 0:
                    self.stdout.write(f'Processed {stats["merchants_processed"]}/{len(merchants_data)} merchants...')

        # Process products and update offers
        if products_data:
            self.stdout.write('\nProcessing products and offers...')
            for product_data in products_data:
                stats['products_processed'] += 1
                product_slug = product_data.get('slug')
                offers_data = product_data.get('offers', [])

                if not product_slug or not offers_data:
                    if stats['products_processed'] % 100 == 0:
                        self.stdout.write(f'Processed {stats["products_processed"]}/{len(products_data)} products...')
                    continue

                # Find product in database
                try:
                    product = Product.objects.get(slug=product_slug)
                except Product.DoesNotExist:
                    if stats['products_processed'] % 100 == 0:
                        self.stdout.write(f'Processed {stats["products_processed"]}/{len(products_data)} products...')
                    continue
                except Product.MultipleObjectsReturned:
                    self.stdout.write(self.style.WARNING(f'Multiple products found with slug: {product_slug}, skipping'))
                    stats['errors'] += 1
                    continue

                # Delete all existing offers for this product before importing new ones
                existing_offers_count = product.offers.count()
                if existing_offers_count > 0:
                    if not dry_run:
                        product.offers.all().delete()
                    stats['offers_deleted'] += existing_offers_count
                    if stats['products_processed'] % 100 == 0 or existing_offers_count > 0:
                        self.stdout.write(f'  Deleted {existing_offers_count} existing offers for product: {product_slug}')

                # Process offers from JSON
                for offer_data in offers_data:
                    merchant_name = offer_data.get('merchant', '')
                    price = offer_data.get('price')
                    currency = offer_data.get('currency', 'MAD')
                    stock_status = offer_data.get('stock_status', 'in_stock')
                    url = offer_data.get('url', '')

                    if not merchant_name or price is None:
                        continue

                    # Get or create merchant
                    try:
                        merchant, merchant_created = Merchant.objects.get_or_create(name=merchant_name)
                        
                        # If merchant was just created, try to find its logo from merchants_data
                        if merchant_created and merchants_data:
                            for m_data in merchants_data:
                                if m_data.get('name') == merchant_name:
                                    logo_info = m_data.get('logo', {})
                                    if logo_info and isinstance(logo_info, dict):
                                        local_path = logo_info.get('local_path', '')
                                        original_url = logo_info.get('url', '')
                                        filename = logo_info.get('filename', '')
                                        
                                        if local_path:
                                            # Convert local_path to absolute file path
                                            if local_path.startswith('/media/'):
                                                relative_path = local_path.replace('/media/', '')
                                                source_path = os.path.join(settings.MEDIA_ROOT, relative_path)
                                            elif local_path.startswith('media/'):
                                                source_path = os.path.join(settings.MEDIA_ROOT, local_path.replace('media/', ''))
                                            else:
                                                source_path = os.path.join(settings.MEDIA_ROOT, local_path.lstrip('/'))
                                            
                                            if os.path.exists(source_path):
                                                target_filename = filename if filename else os.path.basename(source_path)
                                                if not target_filename:
                                                    target_filename = f'{slugify(merchant_name)}.webp'
                                                
                                                target_path = os.path.join(merchants_dir, target_filename)
                                                
                                                # Copy file to merchants directory if copy_files is enabled
                                                if copy_files:
                                                    if not os.path.exists(target_path) or (os.path.exists(source_path) and os.path.getmtime(source_path) > os.path.getmtime(target_path)):
                                                        if not dry_run:
                                                            try:
                                                                shutil.copy2(source_path, target_path)
                                                                stats['logos_copied'] += 1
                                                            except Exception as e:
                                                                self.stdout.write(self.style.WARNING(
                                                                    f'Could not copy logo file {source_path} to {target_path}: {e}'
                                                                ))
                                                        else:
                                                            stats['logos_copied'] += 1
                                                    
                                                    if os.path.exists(target_path):
                                                        if not dry_run:
                                                            merchant.logo_file = f'merchants/{target_filename}'
                                                            if original_url and original_url.startswith('http'):
                                                                merchant.logo = original_url
                                                            merchant.save()
                                                        stats['merchants_updated'] += 1
                                    break
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(
                            f'Error getting/creating merchant {merchant_name}: {e}'
                        ))
                        stats['errors'] += 1
                        continue

                    # Create new offer
                    try:
                        if not dry_run:
                            PriceOffer.objects.create(
                                product=product,
                                merchant=merchant,
                                price=price,
                                currency=currency,
                                stock_status=stock_status,
                                url=url,
                                approval_status='approved'
                            )
                        stats['offers_created'] += 1

                    except Exception as e:
                        self.stdout.write(self.style.ERROR(
                            f'Error creating offer for product {product_slug}, merchant {merchant_name}: {e}'
                        ))
                        stats['errors'] += 1

                if stats['products_processed'] % 100 == 0:
                    self.stdout.write(f'Processed {stats["products_processed"]}/{len(products_data)} products...')

        # Print summary
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('IMPORT SUMMARY'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(f'Merchants processed: {stats["merchants_processed"]}')
        self.stdout.write(f'Merchants updated: {stats["merchants_updated"]}')
        if copy_files:
            self.stdout.write(f'Logos copied: {stats["logos_copied"]}')
        self.stdout.write(f'Products processed: {stats["products_processed"]}')
        self.stdout.write(f'Offers deleted: {stats["offers_deleted"]}')
        self.stdout.write(f'Offers created: {stats["offers_created"]}')
        self.stdout.write(f'Errors: {stats["errors"]}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN MODE - No changes were made to the database'))
        else:
            self.stdout.write(self.style.SUCCESS('\nImport completed successfully!'))

