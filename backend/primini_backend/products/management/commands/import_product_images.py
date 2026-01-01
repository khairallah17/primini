import json
import os
import shutil
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from primini_backend.products.models import Product, ProductImage


class Command(BaseCommand):
    help = 'Import product images from scraped JSON file into the database'

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
            help='Copy image files from newscraping/products to products/ directory'
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

        # Get products from JSON
        products_data = data.get('products', [])
        if not products_data:
            self.stdout.write(self.style.WARNING('No products found in JSON file'))
            return

        self.stdout.write(f'Found {len(products_data)} products in JSON file')

        stats = {
            'processed': 0,
            'matched': 0,
            'images_added': 0,
            'images_skipped': 0,
            'files_copied': 0,
            'errors': 0,
            'products_not_found': []
        }

        # Ensure products directory exists
        products_dir = os.path.join(settings.MEDIA_ROOT, 'products')
        os.makedirs(products_dir, exist_ok=True)

        for product_data in products_data:
            stats['processed'] += 1
            product_slug = product_data.get('slug')
            product_name = product_data.get('name')
            images_data = product_data.get('images', [])

            if not product_slug:
                self.stdout.write(self.style.WARNING(f'Skipping product without slug: {product_name}'))
                continue

            if not images_data:
                continue  # Skip products without images

            # Find product in database by slug
            try:
                product = Product.objects.get(slug=product_slug)
                stats['matched'] += 1
            except Product.DoesNotExist:
                stats['products_not_found'].append({
                    'slug': product_slug,
                    'name': product_name
                })
                if stats['processed'] % 100 == 0:
                    self.stdout.write(f'Processed {stats["processed"]}/{len(products_data)} products...')
                continue
            except Product.MultipleObjectsReturned:
                self.stdout.write(self.style.WARNING(f'Multiple products found with slug: {product_slug}, skipping'))
                stats['errors'] += 1
                continue

            # Check existing images count
            existing_images_count = product.images.count()
            
            # Process images
            for idx, image_info in enumerate(images_data):
                local_path = image_info.get('local_path', '')
                original_url = image_info.get('url', '')
                filename = image_info.get('filename', '')

                if not local_path:
                    continue

                # Convert local_path to absolute file path
                # local_path format: "/media/newscraping/products/filename.webp"
                # Need to convert to: MEDIA_ROOT/newscraping/products/filename.webp
                if local_path.startswith('/media/'):
                    # Remove /media/ prefix and join with MEDIA_ROOT
                    relative_path = local_path.replace('/media/', '')
                    source_path = os.path.join(settings.MEDIA_ROOT, relative_path)
                elif local_path.startswith('media/'):
                    source_path = os.path.join(settings.MEDIA_ROOT, local_path.replace('media/', ''))
                else:
                    # Assume it's already a relative path from MEDIA_ROOT
                    source_path = os.path.join(settings.MEDIA_ROOT, local_path.lstrip('/'))

                # Check if source file exists
                if not os.path.exists(source_path):
                    self.stdout.write(self.style.WARNING(
                        f'Image file not found: {source_path} (product: {product_slug})'
                    ))
                    stats['images_skipped'] += 1
                    continue

                # Calculate order (existing images count + current index)
                order = existing_images_count + idx

                # Determine target filename
                target_filename = filename if filename else os.path.basename(source_path)
                # Make filename unique by prefixing with product slug if needed
                if not target_filename.startswith(product_slug):
                    target_filename = f'{product_slug}_{idx}_{os.path.basename(target_filename)}'
                
                target_path = os.path.join(products_dir, target_filename)

                # Copy file to products directory if copy_files is enabled
                image_field_value = None
                if copy_files:
                    if not os.path.exists(target_path) or os.path.getmtime(source_path) > os.path.getmtime(target_path):
                        if not dry_run:
                            try:
                                shutil.copy2(source_path, target_path)
                                stats['files_copied'] += 1
                            except Exception as e:
                                self.stdout.write(self.style.WARNING(
                                    f'Could not copy image file {source_path} to {target_path}: {e}'
                                ))
                        else:
                            stats['files_copied'] += 1
                    
                    if os.path.exists(target_path):
                        # Use relative path from MEDIA_ROOT for ImageField
                        image_field_value = f'products/{target_filename}'
                
                # Use original URL for image_url field (it's a valid URL)
                # If no original URL, use empty string (image field will be used instead)
                final_image_url = original_url if original_url and original_url.startswith('http') else ''

                # Check if this image already exists for this product
                existing_image = None
                if image_field_value:
                    # Check by image field
                    existing_image = ProductImage.objects.filter(
                        product=product,
                        image=image_field_value
                    ).first()
                elif final_image_url:
                    # Check by image_url
                    existing_image = ProductImage.objects.filter(
                        product=product,
                        image_url=final_image_url
                    ).first()
                else:
                    # Check by filename
                    existing_image = ProductImage.objects.filter(
                        product=product,
                        image__endswith=target_filename
                    ).first()

                if existing_image:
                    # Update order if needed
                    if existing_image.order != order:
                        if not dry_run:
                            existing_image.order = order
                            existing_image.save()
                    continue

                # Create ProductImage entry
                if not dry_run:
                    try:
                        ProductImage.objects.create(
                            product=product,
                            image=image_field_value if image_field_value else None,
                            image_url=final_image_url,
                            order=order
                        )
                        stats['images_added'] += 1
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(
                            f'Error creating image for product {product_slug}: {e}'
                        ))
                        stats['errors'] += 1
                else:
                    stats['images_added'] += 1

            if stats['processed'] % 100 == 0:
                self.stdout.write(f'Processed {stats["processed"]}/{len(products_data)} products...')

        # Print summary
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('IMPORT SUMMARY'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(f'Total products processed: {stats["processed"]}')
        self.stdout.write(f'Products matched in database: {stats["matched"]}')
        self.stdout.write(f'Images added: {stats["images_added"]}')
        if copy_files:
            self.stdout.write(f'Files copied: {stats["files_copied"]}')
        self.stdout.write(f'Images skipped (file not found): {stats["images_skipped"]}')
        self.stdout.write(f'Errors: {stats["errors"]}')
        self.stdout.write(f'Products not found: {len(stats["products_not_found"])}')

        if stats['products_not_found']:
            self.stdout.write(self.style.WARNING('\nFirst 10 products not found in database:'))
            for item in stats['products_not_found'][:10]:
                self.stdout.write(f'  - {item["name"]} (slug: {item["slug"]})')

        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN MODE - No changes were made to the database'))
        else:
            self.stdout.write(self.style.SUCCESS('\nImport completed successfully!'))
