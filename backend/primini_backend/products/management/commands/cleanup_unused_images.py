from django.core.management.base import BaseCommand
from django.conf import settings
from primini_backend.products.models import Product, ProductImage
import os
from pathlib import Path


class Command(BaseCommand):
    help = 'Delete unused images from media/products directory'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without deleting files (just show what would be deleted)'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output for each file'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        media_root = Path(settings.MEDIA_ROOT)
        products_dir = media_root / 'products'
        
        if not products_dir.exists():
            self.stdout.write(self.style.ERROR(f'Products directory does not exist: {products_dir}'))
            return
        
        # Get all image files in the directory
        image_files = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp', '*.JPG', '*.JPEG', '*.PNG', '*.GIF', '*.WEBP', '*.svg', '*.SVG']:
            image_files.extend(products_dir.glob(ext))
        
        self.stdout.write(f'Found {len(image_files)} image files in {products_dir}')
        
        # Get all referenced image paths from database
        referenced_paths = set()
        
        # From Product table - check image and image_url fields
        # Note: image is a URLField, image_file is an ImageField
        # We need to check if the filename appears in image_file field
        products = Product.objects.exclude(image_file__isnull=True).exclude(image_file='')
        for product in products:
            if product.image_file:
                # Get just the filename from the path
                file_path = product.image_file.name
                if file_path:
                    # Remove 'products/' prefix if present
                    filename = file_path.replace('products/', '').lstrip('/')
                    referenced_paths.add(filename)
                    # Also add the full path
                    referenced_paths.add(file_path)
        
        # Also check Product.image field for any local paths
        products_with_image = Product.objects.exclude(image='').exclude(image__isnull=True)
        for product in products_with_image:
            if product.image:
                # Check if it's a local path
                if '/media/products/' in product.image or 'products/' in product.image:
                    # Extract filename
                    if '/media/products/' in product.image:
                        filename = product.image.split('/media/products/')[-1]
                    elif 'products/' in product.image:
                        filename = product.image.split('products/')[-1]
                    else:
                        filename = os.path.basename(product.image)
                    referenced_paths.add(filename)
        
        # From ProductImage table - check image and image_url fields
        product_images = ProductImage.objects.exclude(image__isnull=True).exclude(image='')
        for img in product_images:
            if img.image:
                # Get just the filename from the path
                file_path = img.image.name
                if file_path:
                    # Remove 'products/' prefix if present
                    filename = file_path.replace('products/', '').lstrip('/')
                    referenced_paths.add(filename)
                    # Also add the full path
                    referenced_paths.add(file_path)
        
        # Check ProductImage.image_url for local paths
        product_images_with_url = ProductImage.objects.exclude(image_url='').exclude(image_url__isnull=True)
        for img in product_images_with_url:
            if img.image_url:
                # Check if it's a local path
                if '/media/products/' in img.image_url or 'products/' in img.image_url:
                    # Extract filename
                    if '/media/products/' in img.image_url:
                        filename = img.image_url.split('/media/products/')[-1]
                    elif 'products/' in img.image_url:
                        filename = img.image_url.split('products/')[-1]
                    else:
                        filename = os.path.basename(img.image_url)
                    referenced_paths.add(filename)
        
        self.stdout.write(f'Found {len(referenced_paths)} referenced image paths in database')
        
        # Find unused images
        unused_images = []
        for image_file in image_files:
            # Get just the filename
            filename = image_file.name
            # Also check with 'products/' prefix
            relative_path = f'products/{filename}'
            
            # Check if this file is referenced
            is_referenced = (
                filename in referenced_paths or
                relative_path in referenced_paths or
                str(image_file) in referenced_paths
            )
            
            if not is_referenced:
                unused_images.append(image_file)
                if verbose:
                    self.stdout.write(f'  Unused: {filename}')
        
        self.stdout.write(f'\nFound {len(unused_images)} unused images')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY RUN] Would delete the following files:'))
            for img in unused_images[:20]:  # Show first 20
                self.stdout.write(f'  - {img.name}')
            if len(unused_images) > 20:
                self.stdout.write(f'  ... and {len(unused_images) - 20} more')
        else:
            if unused_images:
                self.stdout.write(f'\nDeleting {len(unused_images)} unused images...')
                deleted_count = 0
                error_count = 0
                
                for img in unused_images:
                    try:
                        img.unlink()  # Delete the file
                        deleted_count += 1
                        if verbose:
                            self.stdout.write(self.style.SUCCESS(f'  ✓ Deleted: {img.name}'))
                    except Exception as e:
                        error_count += 1
                        self.stdout.write(self.style.ERROR(f'  ✗ Error deleting {img.name}: {str(e)}'))
                
                self.stdout.write(self.style.SUCCESS(f'\n✓ Deleted {deleted_count} unused images'))
                if error_count > 0:
                    self.stdout.write(self.style.ERROR(f'✗ {error_count} errors occurred'))
            else:
                self.stdout.write(self.style.SUCCESS('\nNo unused images to delete'))

