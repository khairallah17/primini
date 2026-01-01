from django.core.management.base import BaseCommand
from django.conf import settings
from primini_backend.products.models import Product, ProductImage, Merchant
from pathlib import Path
import requests
import os
from urllib.parse import urlparse
from django.utils.text import slugify
from django.core.files import File
import time
import urllib3
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
import io

# Disable SSL warnings for sites with certificate issues
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Command(BaseCommand):
    help = 'Download remote images and replace with local paths in the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=int,
            default=30,
            help='Request timeout in seconds (default: 30)'
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=0.5,
            help='Delay between requests in seconds (default: 0.5)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making changes to the database'
        )
        parser.add_argument(
            '--skip-products',
            action='store_true',
            help='Skip downloading product images'
        )
        parser.add_argument(
            '--skip-product-images',
            action='store_true',
            help='Skip downloading ProductImage URLs'
        )
        parser.add_argument(
            '--skip-merchants',
            action='store_true',
            help='Skip downloading merchant logos'
        )

    def is_remote_url(self, url):
        """Check if URL is a remote URL (not already local)"""
        if not url or not url.strip():
            return False
        
        url = url.strip()
        
        # Check if it's already a local path
        if url.startswith('/media/') or url.startswith('media/'):
            return False
        
        # Check if it's a local file path
        if not url.startswith('http://') and not url.startswith('https://'):
            return False
        
        # Check if it's pointing to localhost or same domain
        try:
            parsed = urlparse(url)
            if parsed.netloc in ['localhost', '127.0.0.1', '0.0.0.0']:
                return False
            # Check if it's the same domain as the site
            if hasattr(settings, 'ALLOWED_HOSTS') and parsed.netloc in settings.ALLOWED_HOSTS:
                return False
        except:
            pass
        
        return True

    def download_image(self, url, timeout=30):
        """Download an image from URL and return the content"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(
                url,
                headers=headers,
                timeout=timeout,
                verify=False,  # Disable SSL verification for problematic sites
                allow_redirects=True
            )
            response.raise_for_status()
            
            # Check if it's actually an image
            content_type = response.headers.get('content-type', '').lower()
            if not content_type.startswith('image/'):
                # Try to detect image by content if PIL is available
                if PIL_AVAILABLE:
                    try:
                        img = Image.open(io.BytesIO(response.content))
                        img.verify()
                    except:
                        return None
                else:
                    # Without PIL, just check file size and basic validation
                    if len(response.content) < 100:  # Too small to be an image
                        return None
            
            return response.content
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'  Failed to download {url}: {str(e)}'))
            return None

    def get_filename_from_url(self, url, prefix='', directory='products'):
        """Extract filename from URL or generate one"""
        try:
            parsed = urlparse(url)
            path = parsed.path
            filename = os.path.basename(path)
            
            # If no extension or invalid, try to get from content-type or use default
            if not filename or '.' not in filename:
                # Try to get extension from URL path
                ext = '.jpg'  # default
                if '.png' in url.lower():
                    ext = '.png'
                elif '.webp' in url.lower():
                    ext = '.webp'
                elif '.gif' in url.lower():
                    ext = '.gif'
                elif '.jpeg' in url.lower():
                    ext = '.jpeg'
                
                filename = f'{prefix}{ext}'
            else:
                # Clean filename
                name_part = os.path.splitext(filename)[0]
                ext_part = os.path.splitext(filename)[1]
                filename = slugify(name_part) + ext_part
            
            # Ensure unique filename
            base, ext = os.path.splitext(filename)
            counter = 1
            media_dir = os.path.join(settings.MEDIA_ROOT, directory)
            while os.path.exists(os.path.join(media_dir, filename)):
                filename = f'{base}_{counter}{ext}'
                counter += 1
            
            return filename
        except:
            # Fallback
            return f'{prefix}.jpg'

    def handle(self, *args, **options):
        timeout = options['timeout']
        delay = options['delay']
        dry_run = options['dry_run']
        
        # Ensure media directories exist
        media_root = Path(settings.MEDIA_ROOT)
        products_dir = media_root / 'products'
        merchants_dir = media_root / 'merchants'
        products_dir.mkdir(parents=True, exist_ok=True)
        merchants_dir.mkdir(parents=True, exist_ok=True)
        
        stats = {
            'products_processed': 0,
            'products_downloaded': 0,
            'products_failed': 0,
            'product_images_processed': 0,
            'product_images_downloaded': 0,
            'product_images_failed': 0,
            'merchants_processed': 0,
            'merchants_downloaded': 0,
            'merchants_failed': 0,
        }
        
        # Process Product images
        if not options['skip_products']:
            self.stdout.write(self.style.SUCCESS('\n=== Processing Product Images ==='))
            products = Product.objects.exclude(image='').exclude(image__isnull=True)
            
            for product in products:
                if not self.is_remote_url(product.image):
                    continue
                
                stats['products_processed'] += 1
                self.stdout.write(f'\nProcessing product: {product.name}')
                self.stdout.write(f'  URL: {product.image}')
                
                if dry_run:
                    self.stdout.write(self.style.WARNING('  [DRY RUN] Would download and update'))
                    continue
                
                # Generate filename
                filename = self.get_filename_from_url(product.image, prefix=f'{product.slug}_')
                
                # Skip placeholder images
                if 'image_loading' in product.image.lower() or 'placeholder' in product.image.lower():
                    self.stdout.write(self.style.WARNING(f'  ⊘ Skipped placeholder image'))
                    continue
                
                # Download image
                image_content = self.download_image(product.image, timeout)
                if image_content:
                    try:
                        # Save to ImageField using Django's File
                        django_file = File(io.BytesIO(image_content), name=filename)
                        product.image_file.save(filename, django_file, save=False)
                        # Clear the URL field - use empty string (URLField allows blank=True)
                        product.image = ''
                        # Save without update_fields to ensure all changes are saved
                        product.save()
                        
                        # Verify the save worked
                        product.refresh_from_db()
                        if product.image_file and (product.image == '' or product.image is None):
                            stats['products_downloaded'] += 1
                            self.stdout.write(self.style.SUCCESS(f'  ✓ Downloaded: {filename}'))
                        else:
                            stats['products_failed'] += 1
                            self.stdout.write(self.style.ERROR(f'  ✗ Save verification failed - image still: {product.image[:50] if product.image else "None"}'))
                    except Exception as e:
                        stats['products_failed'] += 1
                        self.stdout.write(self.style.ERROR(f'  ✗ Error saving: {str(e)}'))
                else:
                    stats['products_failed'] += 1
                
                time.sleep(delay)
        
        # Process ProductImage URLs
        if not options['skip_product_images']:
            self.stdout.write(self.style.SUCCESS('\n=== Processing ProductImage URLs ==='))
            product_images = ProductImage.objects.exclude(image_url='').exclude(image_url__isnull=True)
            
            for img in product_images:
                if not self.is_remote_url(img.image_url):
                    continue
                
                stats['product_images_processed'] += 1
                self.stdout.write(f'\nProcessing ProductImage for: {img.product.name}')
                self.stdout.write(f'  URL: {img.image_url}')
                
                if dry_run:
                    self.stdout.write(self.style.WARNING('  [DRY RUN] Would download and update'))
                    continue
                
                # Generate filename
                filename = self.get_filename_from_url(
                    img.image_url,
                    prefix=f'{img.product.slug}_img{img.order}_'
                )
                
                # Skip placeholder images
                if 'image_loading' in img.image_url.lower() or 'placeholder' in img.image_url.lower():
                    self.stdout.write(self.style.WARNING(f'  ⊘ Skipped placeholder image'))
                    continue
                
                # Download image
                image_content = self.download_image(img.image_url, timeout)
                if image_content:
                    try:
                        # Save to ImageField using Django's File
                        django_file = File(io.BytesIO(image_content), name=filename)
                        img.image.save(filename, django_file, save=False)
                        # Clear the URL field
                        img.image_url = ''
                        # Save without update_fields to ensure all changes are saved
                        img.save()
                        
                        # Verify the save worked
                        img.refresh_from_db()
                        if img.image and (img.image_url == '' or img.image_url is None):
                            stats['product_images_downloaded'] += 1
                            self.stdout.write(self.style.SUCCESS(f'  ✓ Downloaded: {filename}'))
                        else:
                            stats['product_images_failed'] += 1
                            self.stdout.write(self.style.ERROR(f'  ✗ Save verification failed - image_url still: {img.image_url[:50] if img.image_url else "None"}'))
                    except Exception as e:
                        stats['product_images_failed'] += 1
                        self.stdout.write(self.style.ERROR(f'  ✗ Error saving: {str(e)}'))
                else:
                    stats['product_images_failed'] += 1
                
                time.sleep(delay)
        
        # Process Merchant logos
        if not options['skip_merchants']:
            self.stdout.write(self.style.SUCCESS('\n=== Processing Merchant Logos ==='))
            merchants = Merchant.objects.exclude(logo='').exclude(logo__isnull=True)
            
            for merchant in merchants:
                if not self.is_remote_url(merchant.logo):
                    continue
                
                stats['merchants_processed'] += 1
                self.stdout.write(f'\nProcessing merchant: {merchant.name}')
                self.stdout.write(f'  URL: {merchant.logo}')
                
                if dry_run:
                    self.stdout.write(self.style.WARNING('  [DRY RUN] Would download and update'))
                    continue
                
                # Generate filename
                filename = self.get_filename_from_url(merchant.logo, prefix=f'{slugify(merchant.name)}_logo_', directory='merchants')
                
                # Download image
                image_content = self.download_image(merchant.logo, timeout)
                if image_content:
                    # Save to ImageField using Django's File
                    django_file = File(io.BytesIO(image_content), name=filename)
                    merchant.logo_file.save(filename, django_file, save=False)
                    merchant.logo = ''  # Clear the URL field
                    merchant.save(update_fields=['logo', 'logo_file'])
                    
                    stats['merchants_downloaded'] += 1
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Downloaded: {filename}'))
                else:
                    stats['merchants_failed'] += 1
                
                time.sleep(delay)
        
        # Print summary
        self.stdout.write(self.style.SUCCESS('\n=== Summary ==='))
        self.stdout.write(f'Products: {stats["products_processed"]} processed, {stats["products_downloaded"]} downloaded, {stats["products_failed"]} failed')
        self.stdout.write(f'ProductImages: {stats["product_images_processed"]} processed, {stats["product_images_downloaded"]} downloaded, {stats["product_images_failed"]} failed')
        self.stdout.write(f'Merchants: {stats["merchants_processed"]} processed, {stats["merchants_downloaded"]} downloaded, {stats["merchants_failed"]} failed')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY RUN] No changes were made to the database'))

