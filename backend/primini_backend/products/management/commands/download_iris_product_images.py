from django.core.management.base import BaseCommand
from django.conf import settings
from primini_backend.products.models import Product, ProductImage
from django.core.files import File
from pathlib import Path
import io
import time
import re
import os
import logging
from datetime import datetime
from urllib.parse import urlparse
from django.utils.text import slugify

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Command(BaseCommand):
    help = 'Download product images from IRIS product pages using raw_url_map'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without downloading images or updating database'
        )
        parser.add_argument(
            '--timeout',
            type=int,
            default=30,
            help='Request timeout in seconds (default: 30)'
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=2.0,
            help='Delay between requests in seconds (default: 2.0)'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of products to process (for testing). Example: --limit 5 to test with 5 products'
        )

    def extract_image_urls_from_page(self, page, url, product_id=None):
        """Extract image URLs from IRIS product page - only for the current product"""
        image_urls = []
        
        try:
            # Navigate to the page
            page.goto(url, wait_until='domcontentloaded', timeout=60000)
            time.sleep(5)  # Wait for dynamic content and Cloudflare to load
            
            # Extract product ID from URL if not provided
            if not product_id:
                import re
                match = re.search(r'/(\d+)-', url)
                if match:
                    product_id = match.group(1)
            
            self.stdout.write(f'    Looking for product images (product ID: {product_id})...')
            
            # Extract main image from img.no-sirv-lazy-load
            main_image = page.query_selector('img.no-sirv-lazy-load[itemprop="image"]')
            if main_image:
                src = main_image.get_attribute('src')
                if src and src.startswith('http') and 'iris.ma' in src:
                    # Skip placeholder and menu images
                    if 'image_loading' not in src and '/img/m/' not in src and '/img/ets_megamenu/' not in src:
                        if src not in image_urls:
                            image_urls.append(src)
                            self.stdout.write(f'    Found main image: {src[:80]}...')
            
            # Extract thumbnail images from magictoolbox-selector elements
            # Try multiple selectors to find thumbnails
            thumbnails = page.query_selector_all('a.magictoolbox-selector.mz-thumb, a.magictoolbox-selector, a.mz-thumb, a[data-image], a[data-magic-slide-id]')
            self.stdout.write(f'    Found {len(thumbnails)} thumbnail elements')
            
            for thumb in thumbnails:
                # Try data-image attribute first (this is the large image)
                data_image = thumb.get_attribute('data-image')
                if data_image and data_image.startswith('http') and 'iris.ma' in data_image:
                    # Skip placeholder and menu images
                    if 'image_loading' not in data_image and '/img/m/' not in data_image and '/img/ets_megamenu/' not in data_image:
                        # If we have product_id, prefer images that match it, but don't exclude others yet
                        if data_image not in image_urls:
                            image_urls.append(data_image)
                            self.stdout.write(f'    Found thumbnail (data-image): {data_image[:80]}...')
                else:
                    # Fallback to href
                    href = thumb.get_attribute('href')
                    if href and href.startswith('http') and 'iris.ma' in href:
                        if 'image_loading' not in href and '/img/m/' not in href and '/img/ets_megamenu/' not in href:
                            if href not in image_urls:
                                image_urls.append(href)
                                self.stdout.write(f'    Found thumbnail (href): {href[:80]}...')
            
            # Also try to find images in the product gallery container - use more specific selectors
            gallery_selectors = [
                'div.product-left-side img',
                'div.product-images img',
                'div.MagicToolboxContainer img',
                'div.MagicToolboxSelectorContainer img',
                'section#content img',
                'div.pp-left-column img',
                'div.product-left-side img[itemprop="image"]',
                'img[itemprop="image"]',
                'img.no-sirv-lazy-load',
            ]
            
            gallery_images = []
            for selector in gallery_selectors:
                found = page.query_selector_all(selector)
                gallery_images.extend(found)
            
            # Remove duplicates
            seen_elements = set()
            unique_gallery_images = []
            for img in gallery_images:
                # Use a unique identifier for each element
                try:
                    element_id = img.evaluate('el => el.outerHTML')
                    if element_id not in seen_elements:
                        seen_elements.add(element_id)
                        unique_gallery_images.append(img)
                except:
                    unique_gallery_images.append(img)
            
            self.stdout.write(f'    Found {len(unique_gallery_images)} unique gallery image elements')
            
            for img in unique_gallery_images:
                src = img.get_attribute('src')
                if src and src.startswith('http') and 'iris.ma' in src:
                    # Skip placeholder and menu images
                    if 'image_loading' not in src and '/img/m/' not in src and '/img/ets_megamenu/' not in src:
                        # Prefer large_default versions
                        if 'large_default' in src:
                            if src not in image_urls:
                                image_urls.insert(0, src)  # Insert at beginning
                                self.stdout.write(f'    Found gallery image (large_default): {src[:80]}...')
                        elif src not in image_urls:
                            image_urls.append(src)
                            self.stdout.write(f'    Found gallery image: {src[:80]}...')
            
            # Filter out menu images, placeholder images, and images from other products
            filtered_urls = []
            
            for img_url in image_urls:
                # Skip menu images
                if '/img/m/' in img_url or '/img/ets_megamenu/' in img_url:
                    continue
                # Skip placeholder images
                if 'image_loading' in img_url:
                    continue
                
                # If we have product_id, try to match it, but also include all large_default/listing images
                # from the product gallery (they're likely the same product)
                if product_id:
                    # Check if product_id is in the URL (e.g., /23739-large_default/...)
                    if product_id in img_url:
                        filtered_urls.append(img_url)
                    # Also include large_default and listing images (these are product images)
                    elif 'large_default' in img_url or 'listing' in img_url or 'home_default' in img_url:
                        # Extract ID from URL to check
                        import re
                        match = re.search(r'/(\d+)[-_]', img_url)
                        if match:
                            img_id = match.group(1)
                            # If the image ID is close to product ID (within 1000), likely same product
                            # Or just include all large_default/listing/home_default images from gallery
                            filtered_urls.append(img_url)
                        else:
                            # No ID found, but it's a product image type, include it
                            filtered_urls.append(img_url)
                else:
                    # No product_id, include all non-menu/placeholder images that look like product images
                    if 'large_default' in img_url or 'listing' in img_url or 'home_default' in img_url:
                        filtered_urls.append(img_url)
            
            # Remove duplicates while preserving order
            seen = set()
            unique_urls = []
            for url in filtered_urls:
                if url not in seen:
                    seen.add(url)
                    unique_urls.append(url)
            
            return unique_urls
            
        except PlaywrightTimeoutError:
            self.stdout.write(self.style.WARNING(f'  ⚠ Timeout loading page'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'  ⚠ Error extracting images: {str(e)}'))
            import traceback
            self.stdout.write(self.style.ERROR(f'  Traceback: {traceback.format_exc()}'))
        
        return image_urls

    def download_image(self, url, timeout=30):
        """Download an image from URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://www.iris.ma/'
            }
            
            response = requests.get(
                url,
                headers=headers,
                timeout=timeout,
                verify=False,
                allow_redirects=True
            )
            response.raise_for_status()
            
            # Check if it's an image
            content_type = response.headers.get('content-type', '').lower()
            if not content_type.startswith('image/'):
                # Check if it's SVG (might not have image/ content-type)
                if url.endswith('.svg') or '<svg' in response.text[:100]:
                    return response.content
                return None
            
            return response.content
        except Exception as e:
            return None

    def get_filename_from_url(self, url, product_slug, index=0):
        """Generate filename from URL"""
        try:
            parsed = urlparse(url)
            path = parsed.path
            filename = os.path.basename(path)
            
            if not filename or '.' not in filename:
                ext = '.jpg'
                if '.png' in url.lower():
                    ext = '.png'
                elif '.webp' in url.lower():
                    ext = '.webp'
                elif '.svg' in url.lower():
                    ext = '.svg'
                filename = f'{product_slug}_iris_{index}{ext}'
            else:
                # Clean filename
                name_part = os.path.splitext(filename)[0]
                ext_part = os.path.splitext(filename)[1]
                filename = slugify(name_part) + ext_part
                filename = f'{product_slug}_iris_{index}_{filename}'
            
            # Ensure unique
            base, ext = os.path.splitext(filename)
            counter = 1
            media_dir = Path(settings.MEDIA_ROOT) / 'products'
            while (media_dir / filename).exists():
                filename = f'{base}_{counter}{ext}'
                counter += 1
            
            return filename
        except:
            return f'{product_slug}_iris_{index}.jpg'

    def handle(self, *args, **options):
        if not PLAYWRIGHT_AVAILABLE:
            self.stdout.write(self.style.ERROR(
                'Playwright is not installed. Please install it with: pip install playwright && playwright install'
            ))
            return
        
        dry_run = options['dry_run']
        timeout = options['timeout']
        delay = options['delay']
        limit = options['limit']
        
        # Setup logging to file
        log_dir = Path(settings.BASE_DIR) / 'logs'
        log_dir.mkdir(exist_ok=True)
        log_file = log_dir / f'iris_download_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
        
        # Configure file logger
        file_logger = logging.getLogger('iris_download_file')
        file_logger.setLevel(logging.INFO)
        # Remove existing handlers to avoid duplicates
        file_logger.handlers = []
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        file_logger.addHandler(file_handler)
        
        self.stdout.write(self.style.SUCCESS(f'📝 Logging to: {log_file}'))
        file_logger.info('='*80)
        file_logger.info('IRIS Image Download Script Started')
        file_logger.info(f'Total products to process: {Product.objects.filter(raw_url_map__has_key="IRIS").count()}')
        file_logger.info('='*80)
        
        # Get products with IRIS URLs
        products_queryset = Product.objects.filter(
            raw_url_map__has_key='IRIS'
        ).exclude(
            raw_url_map__IRIS__isnull=True
        ).exclude(
            raw_url_map__IRIS=''
        )
        
        if limit:
            products_queryset = products_queryset[:limit]
        
        # Convert to list to avoid async context issues
        products = list(products_queryset)
        total = len(products)
        self.stdout.write(f'Found {total} products with IRIS URLs')
        file_logger.info(f'Found {total} products with IRIS URLs')
        
        stats = {
            'processed': 0,
            'images_found': 0,
            'images_downloaded': 0,
            'images_failed': 0,
            'products_updated': 0,
            'errors': 0,
            'skipped_no_images': 0,
            'skipped_errors': 0,
            'downloaded_files': [],
            'failed_urls': []
        }
        
        # Process products in batches to restart browser periodically (prevents memory leaks)
        batch_size = 50  # Restart browser every 50 products
        total_batches = (len(products) + batch_size - 1) // batch_size
        
        for batch_num in range(total_batches):
            # Store product data and downloaded images for this batch
            batch_products_to_process = []
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, len(products))
            batch_products = products[start_idx:end_idx]
            
            self.stdout.write(f'\n{"="*80}')
            self.stdout.write(f'Batch {batch_num + 1}/{total_batches} (Products {start_idx + 1}-{end_idx})')
            self.stdout.write('='*80)
            file_logger.info(f'Batch {batch_num + 1}/{total_batches} (Products {start_idx + 1}-{end_idx})')
            
            with sync_playwright() as p:
                # Launch browser with stealth settings
                # Try to use Chrome browser, fallback to Chromium if Chrome is not available
                try:
                    browser = p.chromium.launch(
                        channel="chrome",  # Use installed Chrome browser
                        headless=True,
                        args=[
                            '--disable-blink-features=AutomationControlled',
                            '--disable-dev-shm-usage',
                            '--no-sandbox'
                        ]
                    )
                    if batch_num == 0:  # Only print once
                        self.stdout.write(self.style.SUCCESS('✓ Using Chrome browser'))
                except Exception as e:
                    # Fallback to Chromium if Chrome is not available
                    if batch_num == 0:  # Only print once
                        self.stdout.write(self.style.WARNING(f'⚠ Chrome not available, using Chromium: {str(e)}'))
                    browser = p.chromium.launch(
                        headless=True,
                        args=[
                            '--disable-blink-features=AutomationControlled',
                            '--disable-dev-shm-usage',
                            '--no-sandbox'
                        ]
                    )
                
                context = browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    viewport={'width': 1920, 'height': 1080}
                )
                page = context.new_page()
                
                # Add stealth script
                page.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                """)
                
                try:
                    for idx, product in enumerate(batch_products, start=start_idx + 1):
                        iris_url = product.raw_url_map.get('IRIS', '')
                        if not iris_url or 'iris.ma' not in iris_url:
                            continue
                        
                        stats['processed'] += 1
                        self.stdout.write(f'\n{"="*80}')
                        self.stdout.write(f'[{idx}/{total}] Processing: {product.name}')
                        self.stdout.write(f'  Product ID: {product.id}')
                        self.stdout.write(f'  Product Slug: {product.slug}')
                        self.stdout.write(f'  IRIS URL: {iris_url}')
                        
                        if dry_run:
                            self.stdout.write(self.style.WARNING('  [DRY RUN] Would scrape and download images'))
                            continue
                        
                        # Extract image URLs from page
                        self.stdout.write(f'  📥 Scraping page for images...')
                        # Extract product ID from URL for filtering
                        import re
                        product_id_match = re.search(r'/(\d+)-', iris_url)
                        product_id = product_id_match.group(1) if product_id_match else None
                        
                        # Retry logic for browser crashes
                        max_retries = 3
                        image_urls = []
                        for retry in range(max_retries):
                            try:
                                image_urls = self.extract_image_urls_from_page(page, iris_url, product_id)
                                break  # Success, exit retry loop
                            except Exception as e:
                                if retry < max_retries - 1:
                                    self.stdout.write(self.style.WARNING(f'  ⚠ Browser error (retry {retry + 1}/{max_retries}): {str(e)}'))
                                    # Try to recreate page if browser is still alive
                                    try:
                                        page.close()
                                        page = context.new_page()
                                        page.add_init_script("""
                                            Object.defineProperty(navigator, 'webdriver', {
                                                get: () => undefined
                                            });
                                        """)
                                        time.sleep(2)
                                    except:
                                        # Browser crashed, will be restarted in next batch
                                        raise
                                else:
                                    # Last retry failed
                                    self.stdout.write(self.style.ERROR(f'  ✗ Failed after {max_retries} retries: {str(e)}'))
                                    raise
                        
                        if not image_urls:
                            stats['skipped_no_images'] += 1
                            self.stdout.write(self.style.WARNING('  ⊘ No images found on page'))
                            time.sleep(delay)
                            continue
                        
                        stats['images_found'] += len(image_urls)
                        self.stdout.write(self.style.SUCCESS(f'  ✓ Found {len(image_urls)} image(s)'))
                        for i, img_url in enumerate(image_urls, 1):
                            self.stdout.write(f'    [{i}] {img_url}')
                        
                        # Download images first, then save to database outside Playwright context
                        self.stdout.write(f'  📥 Downloading {len(image_urls)} image(s)...')
                        downloaded_images = []  # Store downloaded content temporarily
                        
                        for img_idx, img_url in enumerate(image_urls):
                            self.stdout.write(f'    [{img_idx + 1}/{len(image_urls)}] Downloading: {img_url[:80]}...')
                            
                            image_content = self.download_image(img_url, timeout)
                            if image_content:
                                filename = self.get_filename_from_url(img_url, product.slug, img_idx)
                                file_size = len(image_content)
                                downloaded_images.append({
                                    'content': image_content,
                                    'filename': filename,
                                    'url': img_url,
                                    'order': img_idx,
                                    'size': file_size
                                })
                                self.stdout.write(self.style.SUCCESS(f'      ✓ Downloaded: {filename} ({file_size:,} bytes)'))
                            else:
                                stats['images_failed'] += 1
                                stats['failed_urls'].append({
                                    'product_id': product.id,
                                    'product_name': product.name,
                                    'url': img_url,
                                    'error': 'Download failed - no content returned',
                                    'order': img_idx
                                })
                                self.stdout.write(self.style.WARNING(f'      ⊘ Failed to download image'))
                        
                        # Store for processing after Playwright context (this batch)
                        if downloaded_images:
                            batch_products_to_process.append({
                                'product': product,
                                'images': downloaded_images
                            })
                            file_logger.info(f'Product {product.id} ({product.name[:50]}): {len(downloaded_images)} images downloaded')
                        
                        time.sleep(delay)
                        
                except KeyboardInterrupt:
                    self.stdout.write(self.style.WARNING('\n\n⚠ Interrupted by user'))
                    break
                except Exception as e:
                    stats['errors'] += 1
                    stats['skipped_errors'] += 1
                    self.stdout.write(self.style.ERROR(f'\n✗ Error processing product: {str(e)}'))
                    import traceback
                    self.stdout.write(self.style.ERROR(f'Traceback:\n{traceback.format_exc()}'))
                    # Continue with next product
                    continue
                finally:
                    try:
                        browser.close()
                    except:
                        pass  # Browser might already be closed
                
                # Close browser after each batch to prevent memory leaks
                self.stdout.write(f'\n✓ Completed batch {batch_num + 1}/{total_batches}, saving to database...')
                file_logger.info(f'Completed batch {batch_num + 1}/{total_batches}, saving to database...')
            
            # Process database saves for this batch (outside Playwright context to avoid async issues)
            if batch_products_to_process:
                self.stdout.write(f'\n{"="*80}')
                self.stdout.write(f'💾 Saving batch {batch_num + 1}: {len(batch_products_to_process)} product(s) to database...')
                self.stdout.write('='*80)
                file_logger.info(f'Saving batch {batch_num + 1}: {len(batch_products_to_process)} products to database')
                
                for product_data in batch_products_to_process:
                    product = product_data['product']
                    downloaded_images = product_data['images']
                    
                    self.stdout.write(f'\nSaving images for: {product.name}')
                    self.stdout.write(f'  Product ID: {product.id}')
                    
                    # Refresh product from database to ensure we have the latest version
                    product.refresh_from_db()
                    
                    first_image_saved = False
                    
                    for img_data in downloaded_images:
                        try:
                            # Check if ProductImage already exists for this order
                            existing_image = ProductImage.objects.filter(
                                product=product,
                                order=img_data['order']
                            ).first()
                            
                            if existing_image:
                                self.stdout.write(f'    ⚠ ProductImage with order {img_data["order"]} already exists, updating...')
                                django_file = File(io.BytesIO(img_data['content']), name=img_data['filename'])
                                existing_image.image.save(img_data['filename'], django_file, save=False)
                                existing_image.image_url = ''  # Clear URL since we have local file
                                existing_image.save(update_fields=['image', 'image_url'])
                                
                                # Update Product.image_file with the first image (order 0)
                                if img_data['order'] == 0 and not first_image_saved:
                                    product.image_file = existing_image.image
                                    product.image = ''  # Clear URL field (empty string instead of None)
                                    product.save(update_fields=['image_file', 'image'])
                                    first_image_saved = True
                                    self.stdout.write(self.style.SUCCESS(f'      ✓ Updated Product.image_file with first image'))
                                
                                stats['images_downloaded'] += 1
                                stats['downloaded_files'].append({
                                    'product_id': product.id,
                                    'product_name': product.name,
                                    'filename': img_data['filename'],
                                    'url': img_data['url'],
                                    'size': img_data['size'],
                                    'order': img_data['order'],
                                    'action': 'updated'
                                })
                                self.stdout.write(self.style.SUCCESS(f'      ✓ Updated: {img_data["filename"]}'))
                            else:
                                # Create new ProductImage entry
                                django_file = File(io.BytesIO(img_data['content']), name=img_data['filename'])
                                product_image = ProductImage(
                                    product=product,
                                    order=img_data['order'],
                                    image_url=''  # Clear URL since we have local file
                                )
                                product_image.image.save(img_data['filename'], django_file, save=False)
                                product_image.save()
                                
                                # Update Product.image_file with the first image (order 0)
                                if img_data['order'] == 0 and not first_image_saved:
                                    product.image_file = product_image.image
                                    product.image = ''  # Clear URL field (empty string instead of None)
                                    product.save(update_fields=['image_file', 'image'])
                                    first_image_saved = True
                                    self.stdout.write(self.style.SUCCESS(f'      ✓ Updated Product.image_file with first image'))
                                
                                stats['images_downloaded'] += 1
                                stats['downloaded_files'].append({
                                    'product_id': product.id,
                                    'product_name': product.name,
                                    'filename': img_data['filename'],
                                    'url': img_data['url'],
                                    'size': img_data['size'],
                                    'order': img_data['order'],
                                    'action': 'created'
                                })
                                self.stdout.write(self.style.SUCCESS(f'      ✓ Created: {img_data["filename"]}'))
                        except Exception as e:
                            stats['images_failed'] += 1
                            stats['failed_urls'].append({
                                'product_id': product.id,
                                'product_name': product.name,
                                'url': img_data['url'],
                                'error': str(e),
                                'order': img_data['order']
                            })
                            self.stdout.write(self.style.ERROR(f'      ✗ Error saving: {str(e)}'))
                            import traceback
                            self.stdout.write(self.style.ERROR(f'      Traceback: {traceback.format_exc()}'))
                            file_logger.error(f'Error saving image for product {product.id}: {str(e)}')
                
                    if any(f['product_id'] == product.id for f in stats['downloaded_files']):
                        stats['products_updated'] += 1
                        self.stdout.write(self.style.SUCCESS(f'  ✓ Product updated with {len([f for f in stats["downloaded_files"] if f["product_id"] == product.id])} image(s)'))
                        file_logger.info(f'Product {product.id} saved successfully with {len([f for f in stats["downloaded_files"] if f["product_id"] == product.id])} images')
                
                self.stdout.write(self.style.SUCCESS(f'\n✓ Batch {batch_num + 1} completed: {len(batch_products_to_process)} products saved to database'))
                file_logger.info(f'Batch {batch_num + 1} completed: {len(batch_products_to_process)} products saved to database')
        
        # Print detailed summary
        file_logger.info('='*80)
        file_logger.info('IRIS Image Download Script Completed')
        file_logger.info('='*80)
        self.stdout.write(self.style.SUCCESS('\n' + '='*80))
        self.stdout.write(self.style.SUCCESS('=== SUMMARY ==='))
        self.stdout.write('='*80)
        self.stdout.write(f'📊 Products processed: {stats["processed"]}')
        self.stdout.write(f'🖼️  Images found: {stats["images_found"]}')
        self.stdout.write(f'✅ Images downloaded: {stats["images_downloaded"]}')
        self.stdout.write(f'❌ Images failed: {stats["images_failed"]}')
        self.stdout.write(f'📦 Products updated: {stats["products_updated"]}')
        self.stdout.write(f'⊘ Products skipped (no images): {stats["skipped_no_images"]}')
        self.stdout.write(f'⚠️  Products with errors: {stats["skipped_errors"]}')
        self.stdout.write(f'🚫 Total errors: {stats["errors"]}')
        
        # Show downloaded files
        if stats['downloaded_files']:
            self.stdout.write(self.style.SUCCESS(f'\n📥 DOWNLOADED FILES ({len(stats["downloaded_files"])}):'))
            self.stdout.write('-'*80)
            for file_info in stats['downloaded_files'][:20]:  # Show first 20
                self.stdout.write(f'  ✓ [{file_info["action"].upper()}] {file_info["filename"]}')
                self.stdout.write(f'     Product: {file_info["product_name"][:60]}...')
                self.stdout.write(f'     Size: {file_info["size"]:,} bytes | Order: {file_info["order"]}')
            if len(stats['downloaded_files']) > 20:
                self.stdout.write(f'  ... and {len(stats["downloaded_files"]) - 20} more files')
        
        # Show failed URLs
        if stats['failed_urls']:
            self.stdout.write(self.style.ERROR(f'\n❌ FAILED DOWNLOADS ({len(stats["failed_urls"])}):'))
            self.stdout.write('-'*80)
            for fail_info in stats['failed_urls'][:20]:  # Show first 20
                self.stdout.write(self.style.ERROR(f'  ✗ {fail_info["url"][:70]}...'))
                self.stdout.write(f'     Product: {fail_info["product_name"][:60]}...')
                self.stdout.write(f'     Error: {fail_info["error"][:100]}')
            if len(stats['failed_urls']) > 20:
                self.stdout.write(f'  ... and {len(stats["failed_urls"]) - 20} more failures')
        
        self.stdout.write('='*80)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY RUN] No changes were made to the database'))

