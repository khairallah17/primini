"""
Management command to scrape product descriptions from external links.

This command:
1. Iterates through all products in the database
2. Gets external links from PriceOffer objects
3. Scrapes each page for product descriptions using domain-specific strategies
4. Uses LLM for complex cases or when specific strategies fail
5. Updates the product description in the database if found
"""

import re
import time
import urllib3
import json
import os
import random
from datetime import datetime
from urllib.parse import urljoin, urlparse
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q, CharField
from django.db.models.functions import Length
from django.conf import settings
from django.utils.text import slugify

from primini_backend.products.models import Product, PriceOffer

# Suppress SSL warnings when verify=False
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# User-Agent rotation list (realistic browser user agents)
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
]

# Try to import OpenAI, but make it optional
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class Command(BaseCommand):
    help = 'Scrape product descriptions from external product links'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit the number of products to process (for testing)',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip products that already have a description',
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=2.0,
            help='Delay between requests in seconds (default: 2.0)',
        )
        parser.add_argument(
            '--timeout',
            type=int,
            default=10,
            help='Request timeout in seconds (default: 10)',
        )
        parser.add_argument(
            '--verify-ssl',
            action='store_true',
            default=False,
            help='Verify SSL certificates (default: False, skips verification)',
        )
        parser.add_argument(
            '--rollback-on-error',
            action='store_true',
            default=False,
            help='Rollback all database changes if any error occurs (default: False). When enabled, uses a single transaction for all updates.',
        )
        parser.add_argument(
            '--commit-interval',
            type=int,
            default=0,
            help='Commit changes every N products (0 = commit each product individually, default: 0)',
        )
        parser.add_argument(
            '--use-llm',
            action='store_true',
            default=False,
            help='Use LLM (OpenAI) for description extraction when specific strategies fail (requires OPENAI_API_KEY)',
        )
        parser.add_argument(
            '--llm-model',
            type=str,
            default='gpt-4o-mini',
            help='OpenAI model to use for LLM extraction (default: gpt-4o-mini)',
        )
        parser.add_argument(
            '--log-file',
            type=str,
            default=None,
            help='Path to log file for detailed logging (default: scrape_descriptions_YYYYMMDD_HHMMSS.log in project root)',
        )
        parser.add_argument(
            '--download-images',
            action='store_true',
            default=False,
            help='Download product images and save them locally to media/products/',
        )
        parser.add_argument(
            '--max-image-size',
            type=int,
            default=5,
            help='Maximum image file size in MB (default: 5)',
        )
        parser.add_argument(
            '--retry-from-json',
            type=str,
            default=None,
            help='Path to JSON file containing failed products to retry',
        )
        parser.add_argument(
            '--failed-json',
            type=str,
            default=None,
            help='Path to JSON file to save failed products (default: failed_products_YYYYMMDD_HHMMSS.json in project root)',
        )

    def handle(self, *args, **options):
        limit = options['limit']
        skip_existing = options['skip_existing']
        delay = options['delay']
        timeout = options['timeout']
        verify_ssl = options['verify_ssl']
        rollback_on_error = options['rollback_on_error']
        commit_interval = options['commit_interval']
        use_llm = options['use_llm']
        llm_model = options['llm_model']
        log_file = options['log_file']
        download_images = options['download_images']
        max_image_size = options['max_image_size']
        retry_from_json = options['retry_from_json']
        failed_json = options['failed_json']
        
        # Initialize failed products list
        self.failed_products = []
        
        # Initialize failed products JSON file
        if not failed_json:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            failed_json = os.path.join(settings.BASE_DIR, f'failed_products_{timestamp}.json')
        
        self.failed_json_path = failed_json
        
        # Load failed products from JSON if retry mode
        if retry_from_json:
            if not os.path.exists(retry_from_json):
                self.stdout.write(self.style.ERROR(f'✗ Retry JSON file not found: {retry_from_json}'))
                return
            try:
                with open(retry_from_json, 'r', encoding='utf-8') as f:
                    retry_data = json.load(f)
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Loaded {len(retry_data)} failed products from {retry_from_json}')
                    )
                    self.log(f"RETRY_MODE: Loading {len(retry_data)} products from {retry_from_json}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Error loading retry JSON: {str(e)}'))
                return
        
        # Initialize log file
        if not log_file:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            log_file = os.path.join(settings.BASE_DIR, f'scrape_descriptions_{timestamp}.log')
        
        # Ensure log directory exists
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        
        self.log_file_path = log_file
        self.log_file = open(log_file, 'w', encoding='utf-8')
        self.log(f"=== Scraping Session Started ===")
        self.log(f"Timestamp: {datetime.now().isoformat()}")
        self.log(f"Log file: {log_file}")
        self.log(f"Options: {json.dumps({k: v for k, v in options.items() if k != 'log_file'}, default=str)}")
        
        # Initialize session with retry strategy and better headers
        self.session = requests.Session()
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=2,  # Exponential backoff: 2s, 4s, 8s
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Initialize LLM client if requested
        llm_client = None
        if use_llm:
            if not OPENAI_AVAILABLE:
                error_msg = '✗ OpenAI library not installed. Install with: pip install openai'
                self.stdout.write(self.style.ERROR(error_msg))
                self.log(f"ERROR: {error_msg}")
                self.log_file.close()
                return
            api_key = os.environ.get('OPENAI_API_KEY') or getattr(settings, 'OPENAI_API_KEY', None)
            if not api_key:
                error_msg = '✗ OPENAI_API_KEY not found. Set it as environment variable or in settings.'
                self.stdout.write(self.style.ERROR(error_msg))
                self.log(f"ERROR: {error_msg}")
                self.log_file.close()
                return
            llm_client = OpenAI(api_key=api_key)
            success_msg = f'✓ LLM enabled using model: {llm_model}'
            self.stdout.write(self.style.SUCCESS(success_msg))
            self.log(f"INFO: {success_msg}")

        # Get products to process
        queryset = Product.objects.all()
        
        if skip_existing:
            # Only process products without descriptions or with very short descriptions
            # Annotate with description length for filtering
            queryset = queryset.annotate(
                desc_length=Length('description')
            ).filter(
                Q(description__isnull=True) | 
                Q(description='') |
                Q(desc_length__lt=50)
            )
        
        if limit:
            queryset = queryset[:limit]
        
        # Convert to list to avoid queryset evaluation issues during transaction
        products_list = list(queryset)
        total_products = len(products_list)
        
        self.stdout.write(
            self.style.SUCCESS(f'Processing {total_products} products...')
        )
        if rollback_on_error:
            self.stdout.write(
                self.style.WARNING('⚠ Rollback mode enabled: All changes will be rolled back if any error occurs')
            )

        stats = {
            'processed': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0,
            'llm_used': 0,
            'images_downloaded': 0,
            'images_failed': 0,
        }

        # Track updated products for potential rollback
        updated_products = []

        # Use transaction management based on rollback mode
        if rollback_on_error:
            # Process all products in a single transaction
            # If any error occurs, all changes will be rolled back
            try:
                with transaction.atomic():
                    stats = self._process_products(
                        products_list, delay, timeout, verify_ssl, 
                        commit_interval, updated_products, stats, skip_existing, rollback_on_error=True,
                        llm_client=llm_client, llm_model=llm_model, use_llm=use_llm,
                        download_images=download_images, max_image_size=max_image_size
                    )
                    self.stdout.write(
                        self.style.SUCCESS('\n✓ All products processed successfully. Committing changes...')
                    )
            except Exception as e:
                # Rollback is automatic when exiting atomic() block with exception
                self.stdout.write(
                    self.style.ERROR(f'\n✗ Critical error occurred: {str(e)}')
                )
                self.stdout.write(
                    self.style.ERROR('⚠ All database changes have been rolled back.')
                )
                # Don't re-raise to avoid showing traceback
                stats['errors'] += 1
        else:
            # Process products individually (default behavior)
            # Each product update is committed immediately
            stats = self._process_products(
                products_list, delay, timeout, verify_ssl, 
                commit_interval, updated_products, stats, skip_existing, rollback_on_error=False,
                llm_client=llm_client, llm_model=llm_model, use_llm=use_llm,
                download_images=download_images, max_image_size=max_image_size
            )

        # Print summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('Summary:'))
        self.stdout.write(f'  Total processed: {stats["processed"]}')
        self.stdout.write(
            self.style.SUCCESS(f'  Updated: {stats["updated"]}')
        )
        self.stdout.write(
            self.style.WARNING(f'  Skipped: {stats["skipped"]}')
        )
        self.stdout.write(
            self.style.ERROR(f'  Errors: {stats["errors"]}')
        )
        if use_llm:
            self.stdout.write(
                self.style.SUCCESS(f'  LLM used: {stats["llm_used"]}')
            )
        if download_images:
            self.stdout.write(
                self.style.SUCCESS(f'  Images downloaded: {stats["images_downloaded"]}')
            )
            if stats['images_failed'] > 0:
                self.stdout.write(
                    self.style.WARNING(f'  Images failed: {stats["images_failed"]}')
                )
        if rollback_on_error and stats['errors'] > 0:
            self.stdout.write(
                self.style.ERROR(f'  ⚠ All changes were rolled back due to errors')
            )
        
        # Save failed products to JSON file
        if hasattr(self, 'failed_products') and self.failed_products:
            try:
                with open(self.failed_json_path, 'w', encoding='utf-8') as f:
                    json.dump(self.failed_products, f, indent=2, ensure_ascii=False)
                self.stdout.write(
                    self.style.WARNING(f'\n⚠ {len(self.failed_products)} failed products saved to: {self.failed_json_path}')
                )
                self.stdout.write(
                    self.style.SUCCESS(f'   Retry with: python manage.py scrape_product_descriptions --retry-from-json {self.failed_json_path}')
                )
                self.log(f"FAILED_PRODUCTS_SAVED: {len(self.failed_products)} products saved to {self.failed_json_path}")
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'\n✗ Error saving failed products JSON: {str(e)}')
                )
        elif hasattr(self, 'failed_products'):
            self.stdout.write(
                self.style.SUCCESS(f'\n✓ No failed products to save')
            )
        
        # Close session
        if hasattr(self, 'session'):
            self.session.close()
        
        # Close log file
        self.log(f"=== Scraping Session Ended ===")
        self.log(f"Final Stats: {json.dumps(stats, default=str)}")
        if self.log_file:
            self.log_file.close()
            self.stdout.write(f'\n📝 Detailed log saved to: {self.log_file_path}')
    
    def log(self, message):
        """Write message to both console and log file."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_message = f"[{timestamp}] {message}"
        if hasattr(self, 'log_file') and self.log_file and not self.log_file.closed:
            try:
                self.log_file.write(log_message + '\n')
                self.log_file.flush()  # Ensure immediate write
            except (AttributeError, ValueError):
                pass  # Log file might be closed or invalid

    def _process_products(self, products_list, delay, timeout, verify_ssl, commit_interval, updated_products, stats, skip_existing, rollback_on_error=False, llm_client=None, llm_model='gpt-4o-mini', use_llm=False, download_images=False, max_image_size=5):
        """
        Process products and update descriptions.
        Returns updated stats dictionary.
        
        Args:
            rollback_on_error: If True, any exception will be raised to trigger rollback.
                              If False, exceptions are caught and logged.
        """
        total_products = len(products_list)
        commit_counter = 0
        
        for idx, item in enumerate(products_list):
            # Handle both dict format (from retry) and Product object format
            if isinstance(item, dict):
                product = item['product']
                url = item.get('url')
                retry_info = item.get('retry_info')
            else:
                product = item
                url = None
                retry_info = None
            
            stats['processed'] += 1
            product_log = {
                'product_id': product.id,
                'product_name': product.name,
                'product_slug': product.slug,
                'status': 'processing',
                'timestamp': datetime.now().isoformat(),
            }
            
            if retry_info:
                product_log['retry_attempt'] = retry_info.get('retry_count', 0) + 1
                product_log['original_error'] = retry_info.get('error_message', 'Unknown')
            
            self.stdout.write(
                f'\n[{stats["processed"]}/{total_products}] Processing: {product.name}'
            )
            self.log(f"PRODUCT_START: ID={product.id}, Name={product.name}, Slug={product.slug}")

            # Skip if product already has a good description (unless retrying)
            if not retry_info and skip_existing and product.description and len(product.description) >= 50:
                skip_reason = 'Product already has description'
                self.stdout.write(self.style.WARNING(f'  Skipping: {skip_reason}'))
                product_log['status'] = 'skipped'
                product_log['reason'] = skip_reason
                product_log['existing_description_length'] = len(product.description)
                self.log(f"PRODUCT_SKIP: {json.dumps(product_log)}")
                stats['skipped'] += 1
                continue

            # Get URL from item or from offer
            if not url:
                offer = product.offers.filter(url__isnull=False).exclude(url='').first()
                if not offer:
                    skip_reason = 'No external link found'
                    self.stdout.write(self.style.WARNING(f'  Skipping: {skip_reason}'))
                    product_log['status'] = 'skipped'
                    product_log['reason'] = skip_reason
                    self.log(f"PRODUCT_SKIP: {json.dumps(product_log)}")
                    stats['skipped'] += 1
                    continue
                url = offer.url
                merchant_name = offer.merchant.name if offer.merchant else None
            else:
                # Find merchant from URL or use unknown
                offer = product.offers.filter(url=url).first()
                merchant_name = offer.merchant.name if offer and offer.merchant else 'Unknown'
            
            product_log['url'] = url
            product_log['merchant'] = merchant_name
            self.stdout.write(f'  Scraping: {url}')
            self.log(f"SCRAPING_START: URL={url}, Merchant={merchant_name}")

            try:
                # Scrape description from the URL
                description_result = self.scrape_description(
                    url, timeout, verify_ssl, product.name, 
                    llm_client=llm_client, llm_model=llm_model, use_llm=use_llm,
                    product_log=product_log
                )
                
                # Download images if requested
                if download_images:
                    try:
                        image_result = self.download_product_image(
                            url, timeout, verify_ssl, product, max_image_size, product_log
                        )
                        if image_result:
                            stats['images_downloaded'] += 1
                            product_log['image_downloaded'] = True
                            product_log['image_path'] = str(image_result) if hasattr(image_result, '__str__') else image_result
                        else:
                            stats['images_failed'] += 1
                            product_log['image_downloaded'] = False
                    except Exception as img_error:
                        stats['images_failed'] += 1
                        product_log['image_error'] = str(img_error)
                        product_log['image_error_type'] = type(img_error).__name__
                        self.log(f"IMAGE_ERROR: Product={product.name}, Error={str(img_error)}")
                        # Don't fail the whole process if image download fails
                
                # Handle different return types
                if description_result is None:
                    description = None
                    extraction_method = None
                elif isinstance(description_result, dict):
                    description = description_result.get('description')
                    extraction_method = description_result.get('method')
                else:
                    description = description_result
                    extraction_method = 'unknown'
                
                if description:
                    # Clean and validate description
                    cleaned_description = self.clean_description(description)
                    product_log['raw_description_length'] = len(description)
                    product_log['cleaned_description_length'] = len(cleaned_description)
                    product_log['extraction_method'] = extraction_method or 'unknown'
                    
                    if len(cleaned_description) >= 50:  # Minimum description length
                        # Store original description for potential rollback
                        original_description = product.description
                        updated_products.append({
                            'product': product,
                            'original_description': original_description
                        })
                        
                        product.description = cleaned_description
                        product.save(update_fields=['description'])
                        
                        product_log['status'] = 'success'
                        product_log['description'] = cleaned_description
                        product_log['original_description'] = original_description
                        
                        # Track LLM usage
                        if extraction_method and ('llm' in extraction_method.lower()):
                            stats['llm_used'] += 1
                        
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  ✓ Updated description ({len(cleaned_description)} chars) via {extraction_method or "unknown"}'
                            )
                        )
                        self.log(f"PRODUCT_SUCCESS: {json.dumps(product_log, ensure_ascii=False)}")
                        stats['updated'] += 1
                        commit_counter += 1
                        
                        # Commit in batches if commit_interval is set (only when rollback is disabled)
                        if not rollback_on_error and commit_interval > 0 and commit_counter >= commit_interval:
                            transaction.commit()
                            commit_counter = 0
                            self.stdout.write(
                                self.style.SUCCESS(f'  ✓ Committed batch of {commit_interval} updates')
                            )
                    else:
                        skip_reason = f'Description too short ({len(cleaned_description)} chars, minimum 50)'
                        product_log['status'] = 'skipped'
                        product_log['reason'] = skip_reason
                        product_log['cleaned_description'] = cleaned_description
                        self.stdout.write(self.style.WARNING(f'  Skipping: {skip_reason}'))
                        self.log(f"PRODUCT_SKIP: {json.dumps(product_log, ensure_ascii=False)}")
                        stats['skipped'] += 1
                else:
                    skip_reason = 'No description found on page'
                    product_log['status'] = 'skipped'
                    product_log['reason'] = skip_reason
                    product_log['extraction_method'] = extraction_method or 'none'
                    self.stdout.write(self.style.WARNING(f'  Skipping: {skip_reason}'))
                    self.log(f"PRODUCT_SKIP: {json.dumps(product_log)}")
                    stats['skipped'] += 1

            except Exception as e:
                error_msg = str(e)
                error_type = type(e).__name__
                product_log['status'] = 'error'
                product_log['error_type'] = error_type
                product_log['error_message'] = error_msg
                product_log['traceback'] = self._get_traceback(e)
                
                self.stdout.write(self.style.ERROR(f'  ✗ Error: {error_msg}'))
                self.log(f"PRODUCT_ERROR: {json.dumps(product_log, ensure_ascii=False)}")
                stats['errors'] += 1
                
                # Save failed product to JSON for retry
                failed_product = {
                    'product_id': product.id,
                    'product_name': product.name,
                    'product_slug': product.slug,
                    'url': url,
                    'merchant': merchant_name,
                    'error_type': error_type,
                    'error_message': error_msg,
                    'timestamp': datetime.now().isoformat(),
                    'retry_count': retry_info.get('retry_count', 0) + 1 if retry_info else 0,
                }
                self.failed_products.append(failed_product)
                
                # If rollback_on_error is enabled, raise exception to trigger rollback
                # Otherwise, continue processing other products
                if rollback_on_error:
                    raise Exception(f'Error processing product "{product.name}": {error_msg}')
                
                # Rate limiting with random variance (more human-like)
                if stats['processed'] < total_products:
                    self._random_delay(delay, variance=0.4)
        
        return stats
    
    def _get_traceback(self, exception):
        """Get traceback string from exception."""
        import traceback
        return traceback.format_exc()
    
    def _get_headers(self, referer=None):
        """
        Generate realistic browser headers with random user-agent rotation.
        Helps bypass basic anti-bot protection.
        """
        user_agent = random.choice(USER_AGENTS)
        headers = {
            'User-Agent': user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none' if not referer else 'same-origin',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
        }
        
        if referer:
            headers['Referer'] = referer
        
        return headers
    
    def _random_delay(self, base_delay, variance=0.5):
        """
        Add random delay to make requests look more human-like.
        """
        delay = base_delay * (1 + random.uniform(-variance, variance))
        time.sleep(max(0.5, delay))  # Minimum 0.5 seconds

    def scrape_description(self, url, timeout=10, verify_ssl=False, product_name=None, llm_client=None, llm_model='gpt-4o-mini', use_llm=False, product_log=None):
        """
        Scrape product description from a URL using domain-specific strategies.
        Falls back to LLM extraction if enabled and specific strategies fail.
        Returns dict with 'description' and 'method' keys, or None.
        """
        try:
            # Get realistic headers with random user-agent
            headers = self._get_headers()
            
            # Add random delay before request (human-like behavior)
            self._random_delay(0.5, variance=0.3)
            
            # Use session with retry strategy
            response = self.session.get(
                url, 
                headers=headers, 
                timeout=timeout, 
                allow_redirects=True,
                verify=verify_ssl
            )
            response.raise_for_status()
            
            if product_log:
                product_log['http_status'] = response.status_code
                product_log['response_size'] = len(response.content)
                product_log['final_url'] = response.url

            # Parse HTML
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Get domain for domain-specific strategies
            parsed_url = urlparse(url)
            domain = parsed_url.netloc.lower()
            
            if product_log:
                product_log['domain'] = domain
            
            # Check if this looks like a product listing page (not a single product)
            # This happens on jumia.ma when product is not found
            is_listing = self._is_product_listing_page(soup, domain)
            if product_log:
                product_log['is_listing_page'] = is_listing
            
            if is_listing:
                if use_llm and llm_client:
                    self.log(f"LLM_FALLBACK: Listing page detected, using LLM for URL={url}")
                    result = self._extract_with_llm(soup, url, product_name, llm_client, llm_model, product_log)
                    if result:
                        return {'description': result, 'method': 'llm_listing_page'}
                if product_log:
                    product_log['reason'] = 'Page is a product listing, not a single product page'
                return None

            # Domain-specific extraction strategies
            description = None
            method = None
            
            if 'iris.ma' in domain:
                description = self._scrape_iris_ma(soup)
                method = 'iris_ma_specific' if description else None
            elif 'primini.ma' in domain:
                description = self._scrape_primini_ma(soup)
                method = 'primini_ma_specific' if description else None
            elif 'biougnach.ma' in domain:
                description = self._scrape_biougnach_ma(soup)
                method = 'biougnach_ma_specific' if description else None
            elif 'jumia.ma' in domain or 'jumia.com' in domain:
                description = self._scrape_jumia(soup)
                method = 'jumia_specific' if description else None
            
            # If domain-specific strategy worked, return it
            if description and len(description.strip()) >= 50:
                if product_log:
                    product_log['extraction_attempts'] = product_log.get('extraction_attempts', []) + [method]
                return {'description': description, 'method': method}
            
            # Fallback to generic strategies
            description = self._scrape_generic(soup)
            if description and len(description.strip()) >= 50:
                method = 'generic_fallback'
                if product_log:
                    product_log['extraction_attempts'] = product_log.get('extraction_attempts', []) + [method]
                return {'description': description, 'method': method}
            
            # If all strategies failed and LLM is enabled, try LLM extraction
            if use_llm and llm_client:
                self.log(f"LLM_FALLBACK: All scraping strategies failed, using LLM for URL={url}")
                result = self._extract_with_llm(soup, url, product_name, llm_client, llm_model, product_log)
                if result:
                    return {'description': result, 'method': 'llm_fallback'}
            
            if product_log:
                product_log['extraction_attempts'] = product_log.get('extraction_attempts', []) + ['all_failed']
                product_log['reason'] = 'All extraction strategies failed'
            
            return None

        except requests.exceptions.RequestException as e:
            error_msg = f'Request failed: {str(e)}'
            if product_log:
                product_log['error'] = error_msg
                product_log['error_type'] = 'RequestException'
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f'Parsing failed: {str(e)}'
            if product_log:
                product_log['error'] = error_msg
                product_log['error_type'] = type(e).__name__
            raise Exception(error_msg)
    
    def _is_product_listing_page(self, soup, domain):
        """
        Check if the page is a product listing page (multiple products) rather than a single product page.
        This happens on jumia.ma when a product is not found.
        """
        # Check for multiple product cards/items
        product_indicators = [
            soup.select('div[class*="product"]'),
            soup.select('article[class*="product"]'),
            soup.select('div[class*="item"]'),
            soup.select('div[class*="card"]'),
        ]
        
        product_count = 0
        for indicators in product_indicators:
            if indicators:
                product_count += len(indicators)
                if product_count > 5:  # If more than 5 product-like elements, likely a listing page
                    return True
        
        # Check for search results indicators
        search_indicators = [
            soup.find('div', class_=re.compile(r'search|results|listing', re.I)),
            soup.find('h1', string=re.compile(r'results|trouvé|produits', re.I)),
        ]
        
        if any(search_indicators):
            return True
        
        return False
    
    def _scrape_iris_ma(self, soup):
        """Extract description from iris.ma - description is under the title."""
        # Find the product title first
        title = soup.find('h1') or soup.find('h2', class_=re.compile(r'title|product', re.I))
        
        if title:
            # Look for description right after the title
            # Try next sibling or parent's next sibling
            current = title.find_next_sibling()
            if current:
                # Get text from next sibling elements
                description_parts = []
                for sibling in title.find_next_siblings(['p', 'div', 'section'], limit=5):
                    text = sibling.get_text(separator=' ', strip=True)
                    if text and len(text) > 20:
                        description_parts.append(text)
                
                if description_parts:
                    return ' '.join(description_parts)
            
            # Alternative: look in parent container
            parent = title.find_parent(['div', 'section', 'article'])
            if parent:
                # Get all paragraphs after the title
                paragraphs = parent.find_all('p')
                if paragraphs:
                    texts = [p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True) and len(p.get_text(strip=True)) > 20]
                    if texts:
                        return ' '.join(texts)
        
        return None
    
    def _scrape_primini_ma(self, soup):
        """Extract description from primini.ma - description starts with 'Caractéristiques'."""
        # Find element containing "Caractéristiques"
        characteristics = soup.find(string=re.compile(r'Caractéristiques', re.I))
        
        if characteristics:
            # Get parent element
            parent = characteristics.find_parent(['div', 'section', 'article', 'p'])
            if parent:
                # Get all text from this element and its siblings
                text = parent.get_text(separator=' ', strip=True)
                # Remove "Caractéristiques" from the start if present
                text = re.sub(r'^Caractéristiques\s*:?\s*', '', text, flags=re.I)
                if len(text) >= 50:
                    return text
        
        return None
    
    def _scrape_biougnach_ma(self, soup):
        """Extract description from biougnach.ma - description is in a tab named 'description'."""
        # Look for tab buttons/links containing "description"
        desc_tab = soup.find('a', string=re.compile(r'description', re.I)) or \
                   soup.find('button', string=re.compile(r'description', re.I)) or \
                   soup.find('li', string=re.compile(r'description', re.I))
        
        if desc_tab:
            # Find the tab content - could be in data-target, href, or next sibling
            tab_id = desc_tab.get('data-target') or desc_tab.get('href', '').replace('#', '')
            
            if tab_id:
                # Find element with matching id
                tab_content = soup.find(id=tab_id) or soup.find('div', {'data-tab': tab_id})
                if tab_content:
                    text = tab_content.get_text(separator=' ', strip=True)
                    if len(text) >= 50:
                        return text
            
            # Alternative: look for tab panel that becomes visible
            tab_panels = soup.find_all('div', class_=re.compile(r'tab|panel|content', re.I))
            for panel in tab_panels:
                # Check if this panel is associated with description tab
                if 'description' in panel.get('class', []) or 'description' in panel.get('id', '').lower():
                    text = panel.get_text(separator=' ', strip=True)
                    if len(text) >= 50:
                        return text
        
        # Fallback: look for div with id/class containing "description"
        desc_div = soup.find('div', id=re.compile(r'description', re.I)) or \
                   soup.find('div', class_=re.compile(r'description', re.I))
        if desc_div:
            text = desc_div.get_text(separator=' ', strip=True)
            if len(text) >= 50:
                return text
        
        return None
    
    def _scrape_jumia(self, soup):
        """Extract description from jumia.ma/com."""
        # Jumia typically has description in specific containers
        # Look for product description section
        desc_selectors = [
            'div[data-name="Description"]',
            'div.markup',
            'div.product-description',
            'section.product-description',
            'div[class*="description"]',
        ]
        
        for selector in desc_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(separator=' ', strip=True)
                if len(text) >= 50:
                    return text
        
        # Try to find structured data
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    description = data.get('description')
                    if description and isinstance(description, str) and len(description) >= 50:
                        return description
            except:
                pass
        
        return None
    
    def _scrape_generic(self, soup):
        """Generic scraping strategies for unknown domains."""
        # Strategy 1: Try meta description tag
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            content = meta_desc.get('content').strip()
            if len(content) >= 50:
                return content

        # Strategy 2: Try Open Graph description
        og_desc = soup.find('meta', attrs={'property': 'og:description'})
        if og_desc and og_desc.get('content'):
            content = og_desc.get('content').strip()
            if len(content) >= 50:
                return content

        # Strategy 3: Try common product description selectors
        description_selectors = [
            'div.product-description',
            'div.description',
            'div.product-details',
            'div.product-info',
            'section.description',
            'div[class*="description"]',
            'div[class*="product-description"]',
            'div[class*="product-details"]',
            'div[class*="product-info"]',
            'p.product-description',
            'p.description',
            'article.product-description',
            'div.content',
            'div.product-content',
        ]

        for selector in description_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(separator=' ', strip=True)
                text = re.sub(r'\s+', ' ', text)
                if len(text) >= 50:
                    return text

        # Strategy 4: Try to find main content area
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile(r'content|main|product'))
        if main_content:
            paragraphs = main_content.find_all('p')
            if paragraphs:
                texts = [p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)]
                combined = ' '.join(texts)
                if len(combined) >= 50:
                    return combined

        # Strategy 5: Try to extract from structured data (JSON-LD)
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    description = (
                        data.get('description') or
                        data.get('about') or
                        (data.get('offers', {}) if isinstance(data.get('offers'), dict) else {}).get('description')
                    )
                    if description and isinstance(description, str) and len(description) >= 50:
                        return description
            except:
                pass

        return None
    
    def _extract_with_llm(self, soup, url, product_name, llm_client, llm_model, product_log=None):
        """
        Use LLM to extract product description from full HTML page.
        Sends the entire HTML to LLM for better context.
        """
        try:
            # Get the full HTML (but remove scripts and styles to reduce size)
            html_content = str(soup)
            
            # Remove script and style tags to reduce token usage while keeping structure
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get cleaned HTML
            cleaned_html = str(soup)
            
            # Limit HTML size to avoid token limits (keep first 150KB of HTML)
            # This is roughly 37,500 tokens for HTML
            if len(cleaned_html) > 150000:
                cleaned_html = cleaned_html[:150000] + "...[truncated]"
            
            if product_log:
                product_log['llm_html_size'] = len(cleaned_html)
                product_log['llm_model'] = llm_model
            
            # Prepare prompt for LLM
            prompt = f"""You are a web scraping assistant specialized in extracting product descriptions from HTML pages.

Product Name: {product_name or 'Unknown Product'}
URL: {url}

HTML Content:
{cleaned_html}

Instructions:
1. Analyze the HTML structure to find the product description for the product named "{product_name}"
2. Extract a comprehensive, well-formatted product description (minimum 50 characters)
3. The description should be clean, readable, and properly formatted
4. If the page shows multiple products (search results, listing page), return "NOT_FOUND"
5. If the product "{product_name}" is not found on this page, return "NOT_FOUND"
6. If no clear product description exists, return "NOT_FOUND"
7. Return ONLY the product description text in a clean, readable format - no prefixes, no explanations, just the description

Product Description:"""

            # Log LLM request
            self.log(f"LLM_REQUEST: Product={product_name}, URL={url}, Model={llm_model}, HTML_size={len(cleaned_html)}")
            
            # Call OpenAI API
            response = llm_client.chat.completions.create(
                model=llm_model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a helpful assistant that extracts product descriptions from HTML pages. Always return clean, well-formatted product descriptions or 'NOT_FOUND' if the product is not found."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,  # Lower temperature for more consistent extraction
                max_tokens=1000  # Increased for longer descriptions
            )
            
            description = response.choices[0].message.content.strip()
            
            # Log LLM response
            if product_log:
                product_log['llm_tokens_used'] = response.usage.total_tokens if hasattr(response, 'usage') else None
                product_log['llm_response_length'] = len(description)
            
            self.log(f"LLM_RESPONSE: Product={product_name}, Response_length={len(description)}, Tokens={response.usage.total_tokens if hasattr(response, 'usage') else 'unknown'}")
            
            # Check if LLM returned "NOT_FOUND"
            if description.upper() == "NOT_FOUND" or description.upper().startswith("NOT_FOUND"):
                if product_log:
                    product_log['llm_result'] = 'NOT_FOUND'
                self.log(f"LLM_NOT_FOUND: Product={product_name}, URL={url}")
                return None
            
            # Validate description length
            if len(description) < 50:
                if product_log:
                    product_log['llm_result'] = 'too_short'
                    product_log['llm_description'] = description
                self.log(f"LLM_TOO_SHORT: Product={product_name}, Length={len(description)}")
                return None
            
            if product_log:
                product_log['llm_result'] = 'success'
                product_log['llm_description'] = description
            
            return description
            
        except Exception as e:
            error_msg = f'LLM extraction failed: {str(e)}'
            if product_log:
                product_log['llm_error'] = error_msg
                product_log['llm_error_type'] = type(e).__name__
            self.log(f"LLM_ERROR: Product={product_name}, Error={error_msg}")
            # If LLM fails, return None (don't raise exception to allow script to continue)
            return None

    def clean_description(self, description):
        """
        Clean and normalize the scraped description.
        """
        if not description:
            return ''

        # Remove extra whitespace
        description = re.sub(r'\s+', ' ', description)
        
        # Remove common unwanted patterns
        description = re.sub(r'\s*[•·]\s*', ' ', description)  # Bullet points
        description = re.sub(r'\s*-\s*-\s*', ' ', description)  # Multiple dashes
        
        # Remove very short lines (likely navigation or metadata)
        lines = description.split('\n')
        cleaned_lines = [line.strip() for line in lines if len(line.strip()) > 20]
        description = ' '.join(cleaned_lines)
        
        # Limit description length (max 2000 characters)
        if len(description) > 2000:
            description = description[:1997] + '...'
        
        return description.strip()
    
    def extract_image_urls(self, soup, base_url):
        """
        Extract product image URLs from HTML.
        Returns a list of image URLs, prioritizing main product images.
        """
        image_urls = []
        parsed_base = urlparse(base_url)
        base_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"
        
        # Strategy 1: Open Graph image (usually the main product image)
        og_image = soup.find('meta', attrs={'property': 'og:image'})
        if og_image and og_image.get('content'):
            img_url = og_image.get('content').strip()
            if img_url.startswith('//'):
                img_url = f"{parsed_base.scheme}:{img_url}"
            elif img_url.startswith('/'):
                img_url = urljoin(base_domain, img_url)
            elif not img_url.startswith('http'):
                img_url = urljoin(base_url, img_url)
            if img_url.startswith('http'):
                image_urls.append(img_url)
        
        # Strategy 2: Product image selectors (common patterns)
        product_image_selectors = [
            'img.product-image',
            'img[class*="product"]',
            'img[class*="main"]',
            'img[class*="primary"]',
            'img[data-product-image]',
            'img[data-src]',  # Lazy-loaded images
            '.product-image img',
            '.product-gallery img',
            '.product-photo img',
        ]
        
        for selector in product_image_selectors:
            images = soup.select(selector)
            for img in images:
                img_url = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
                if img_url:
                    img_url = img_url.strip()
                    # Handle relative URLs
                    if img_url.startswith('//'):
                        img_url = f"{parsed_base.scheme}:{img_url}"
                    elif img_url.startswith('/'):
                        img_url = urljoin(base_domain, img_url)
                    elif not img_url.startswith('http'):
                        img_url = urljoin(base_url, img_url)
                    if img_url.startswith('http') and img_url not in image_urls:
                        image_urls.append(img_url)
        
        # Strategy 3: First large image in main content area
        if not image_urls:
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile(r'content|main|product'))
            if main_content:
                images = main_content.find_all('img', src=True)
                for img in images:
                    img_url = img.get('src') or img.get('data-src')
                    if img_url:
                        img_url = img_url.strip()
                        if img_url.startswith('//'):
                            img_url = f"{parsed_base.scheme}:{img_url}"
                        elif img_url.startswith('/'):
                            img_url = urljoin(base_domain, img_url)
                        elif not img_url.startswith('http'):
                            img_url = urljoin(base_url, img_url)
                        if img_url.startswith('http') and img_url not in image_urls:
                            # Filter out small images (likely icons) and common non-product images
                            if not any(exclude in img_url.lower() for exclude in ['icon', 'logo', 'avatar', 'banner', 'ad', 'advertisement']):
                                image_urls.append(img_url)
                                break  # Take first valid image
        
        return image_urls[:3]  # Return up to 3 images
    
    def download_product_image(self, url, timeout, verify_ssl, product, max_image_size_mb, product_log=None):
        """
        Download product image from the scraped page and save it locally.
        Returns the relative path to the saved image, or None if failed.
        """
        try:
            # Get realistic headers with referer
            headers = self._get_headers(referer=url)
            
            # Add random delay before request
            self._random_delay(0.3, variance=0.2)
            
            # Use session with retry strategy
            response = self.session.get(url, headers=headers, timeout=timeout, verify=verify_ssl)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            image_urls = self.extract_image_urls(soup, url)
            
            if not image_urls:
                if product_log:
                    product_log['image_extraction'] = 'no_images_found'
                self.log(f"IMAGE_EXTRACTION: Product={product.name}, No images found on page")
                return None
            
            # Try to download the first valid image
            for img_url in image_urls:
                try:
                    # Get headers for image request with referer
                    img_headers = self._get_headers(referer=url)
                    img_headers['Accept'] = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                    
                    # Small random delay before image download
                    self._random_delay(0.2, variance=0.1)
                    
                    # Download image using session
                    img_response = self.session.get(
                        img_url,
                        headers=img_headers,
                        timeout=timeout,
                        verify=verify_ssl,
                        stream=True  # Stream for large files
                    )
                    img_response.raise_for_status()
                    
                    # Check content type
                    content_type = img_response.headers.get('content-type', '').lower()
                    if not content_type.startswith('image/'):
                        continue
                    
                    # Check file size
                    content_length = img_response.headers.get('content-length')
                    if content_length:
                        size_mb = int(content_length) / (1024 * 1024)
                        if size_mb > max_image_size_mb:
                            if product_log:
                                product_log['image_error'] = f'Image too large: {size_mb:.2f}MB (max: {max_image_size_mb}MB)'
                            continue
                    
                    # Read image data
                    img_data = img_response.content
                    size_mb = len(img_data) / (1024 * 1024)
                    
                    if size_mb > max_image_size_mb:
                        if product_log:
                            product_log['image_error'] = f'Image too large: {size_mb:.2f}MB (max: {max_image_size_mb}MB)'
                        continue
                    
                    # Determine file extension from content type or URL
                    ext = 'jpg'  # default
                    if 'jpeg' in content_type or 'jpg' in content_type:
                        ext = 'jpg'
                    elif 'png' in content_type:
                        ext = 'png'
                    elif 'webp' in content_type:
                        ext = 'webp'
                    elif 'gif' in content_type:
                        ext = 'gif'
                    else:
                        # Try to get extension from URL
                        parsed = urlparse(img_url)
                        path_ext = os.path.splitext(parsed.path)[1].lower()
                        if path_ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                            ext = path_ext[1:]  # Remove the dot
                    
                    # Create filename from product slug
                    filename = f"{product.slug or slugify(product.name)}.{ext}"
                    
                    # Ensure media/products directory exists
                    media_root = Path(settings.MEDIA_ROOT)
                    products_dir = media_root / 'products'
                    products_dir.mkdir(parents=True, exist_ok=True)
                    
                    # Save image
                    image_path = products_dir / filename
                    with open(image_path, 'wb') as f:
                        f.write(img_data)
                    
                    # Update product with image file
                    product.image_file.name = f'products/{filename}'
                    product.save(update_fields=['image_file'])
                    
                    if product_log:
                        product_log['image_url'] = img_url
                        product_log['image_size_mb'] = round(size_mb, 2)
                        product_log['image_filename'] = filename
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Downloaded image: {filename} ({size_mb:.2f}MB)')
                    )
                    self.log(f"IMAGE_DOWNLOAD_SUCCESS: Product={product.name}, URL={img_url}, Size={size_mb:.2f}MB, File={filename}")
                    
                    return f'products/{filename}'
                    
                except Exception as img_error:
                    if product_log:
                        product_log['image_error'] = str(img_error)
                    self.log(f"IMAGE_DOWNLOAD_ERROR: Product={product.name}, URL={img_url}, Error={str(img_error)}")
                    continue  # Try next image URL
            
            # All image URLs failed
            return None
            
        except Exception as e:
            if product_log:
                product_log['image_error'] = str(e)
                product_log['image_error_type'] = type(e).__name__
            self.log(f"IMAGE_EXTRACTION_ERROR: Product={product.name}, Error={str(e)}")
            return None
