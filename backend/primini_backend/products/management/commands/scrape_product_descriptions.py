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
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q, CharField
from django.db.models.functions import Length
from django.conf import settings

from primini_backend.products.models import Product, PriceOffer

# Suppress SSL warnings when verify=False
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

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
        
        # Initialize LLM client if requested
        llm_client = None
        if use_llm:
            if not OPENAI_AVAILABLE:
                self.stdout.write(
                    self.style.ERROR('✗ OpenAI library not installed. Install with: pip install openai')
                )
                return
            api_key = os.environ.get('OPENAI_API_KEY') or getattr(settings, 'OPENAI_API_KEY', None)
            if not api_key:
                self.stdout.write(
                    self.style.ERROR('✗ OPENAI_API_KEY not found. Set it as environment variable or in settings.')
                )
                return
            llm_client = OpenAI(api_key=api_key)
            self.stdout.write(
                self.style.SUCCESS(f'✓ LLM enabled using model: {llm_model}')
            )

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
                        llm_client=llm_client, llm_model=llm_model, use_llm=use_llm
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
                llm_client=llm_client, llm_model=llm_model, use_llm=use_llm
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
        if rollback_on_error and stats['errors'] > 0:
            self.stdout.write(
                self.style.ERROR(f'  ⚠ All changes were rolled back due to errors')
            )

    def _process_products(self, products_list, delay, timeout, verify_ssl, commit_interval, updated_products, stats, skip_existing, rollback_on_error=False, llm_client=None, llm_model='gpt-4o-mini', use_llm=False):
        """
        Process products and update descriptions.
        Returns updated stats dictionary.
        
        Args:
            rollback_on_error: If True, any exception will be raised to trigger rollback.
                              If False, exceptions are caught and logged.
        """
        total_products = len(products_list)
        commit_counter = 0
        
        for idx, product in enumerate(products_list):
            stats['processed'] += 1
            self.stdout.write(
                f'\n[{stats["processed"]}/{total_products}] Processing: {product.name}'
            )

            # Skip if product already has a good description
            if skip_existing and product.description and len(product.description) >= 50:
                self.stdout.write(
                    self.style.WARNING(f'  Skipping: Product already has description')
                )
                stats['skipped'] += 1
                continue

            # Get the first available offer URL
            offer = product.offers.filter(url__isnull=False).exclude(url='').first()
            
            if not offer:
                self.stdout.write(
                    self.style.WARNING(f'  Skipping: No external link found')
                )
                stats['skipped'] += 1
                continue

            url = offer.url
            self.stdout.write(f'  Scraping: {url}')

            try:
                # Scrape description from the URL
                description = self.scrape_description(url, timeout, verify_ssl, product.name, llm_client=llm_client, llm_model=llm_model, use_llm=use_llm)
                
                if description:
                    # Clean and validate description
                    cleaned_description = self.clean_description(description)
                    
                    if len(cleaned_description) >= 50:  # Minimum description length
                        # Store original description for potential rollback
                        original_description = product.description
                        updated_products.append({
                            'product': product,
                            'original_description': original_description
                        })
                        
                        product.description = cleaned_description
                        product.save(update_fields=['description'])
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  ✓ Updated description ({len(cleaned_description)} chars)'
                            )
                        )
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
                        self.stdout.write(
                            self.style.WARNING(
                                f'  Skipping: Description too short ({len(cleaned_description)} chars)'
                            )
                        )
                        stats['skipped'] += 1
                else:
                    self.stdout.write(
                        self.style.WARNING('  Skipping: No description found on page')
                    )
                    stats['skipped'] += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Error: {str(e)}')
                )
                stats['errors'] += 1
                # If rollback_on_error is enabled, raise exception to trigger rollback
                # Otherwise, continue processing other products
                if rollback_on_error:
                    raise Exception(f'Error processing product "{product.name}": {str(e)}')

            # Rate limiting
            if stats['processed'] < total_products:
                time.sleep(delay)
        
        return stats

    def scrape_description(self, url, timeout=10, verify_ssl=False, product_name=None, llm_client=None, llm_model='gpt-4o-mini', use_llm=False):
        """
        Scrape product description from a URL using domain-specific strategies.
        Falls back to LLM extraction if enabled and specific strategies fail.
        """
        try:
            # Set headers to mimic a browser
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
            }

            response = requests.get(
                url, 
                headers=headers, 
                timeout=timeout, 
                allow_redirects=True,
                verify=verify_ssl
            )
            response.raise_for_status()

            # Parse HTML
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Get domain for domain-specific strategies
            parsed_url = urlparse(url)
            domain = parsed_url.netloc.lower()
            
            # Check if this looks like a product listing page (not a single product)
            # This happens on jumia.ma when product is not found
            if self._is_product_listing_page(soup, domain):
                if use_llm and llm_client:
                    return self._extract_with_llm(soup, url, product_name, llm_client, llm_model)
                return None

            # Domain-specific extraction strategies
            description = None
            
            if 'iris.ma' in domain:
                description = self._scrape_iris_ma(soup)
            elif 'primini.ma' in domain:
                description = self._scrape_primini_ma(soup)
            elif 'biougnach.ma' in domain:
                description = self._scrape_biougnach_ma(soup)
            elif 'jumia.ma' in domain or 'jumia.com' in domain:
                description = self._scrape_jumia(soup)
            
            # If domain-specific strategy worked, return it
            if description and len(description.strip()) >= 50:
                return description
            
            # Fallback to generic strategies
            description = self._scrape_generic(soup)
            if description and len(description.strip()) >= 50:
                return description
            
            # If all strategies failed and LLM is enabled, try LLM extraction
            if use_llm and llm_client:
                return self._extract_with_llm(soup, url, product_name, llm_client, llm_model)
            
            return None

        except requests.exceptions.RequestException as e:
            raise Exception(f'Request failed: {str(e)}')
        except Exception as e:
            raise Exception(f'Parsing failed: {str(e)}')
    
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
    
    def _extract_with_llm(self, soup, url, product_name, llm_client, llm_model):
        """
        Use LLM to extract product description from HTML content.
        This is used as a fallback when specific scraping strategies fail.
        """
        try:
            # Get clean text content from the page (remove scripts, styles, etc.)
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "header", "footer"]):
                script.decompose()
            
            # Get main content
            main_content = soup.find('main') or soup.find('article') or soup.find('body')
            if not main_content:
                return None
            
            # Extract text (limit to avoid token limits)
            page_text = main_content.get_text(separator='\n', strip=True)
            # Limit to first 8000 characters to stay within token limits
            page_text = page_text[:8000]
            
            # Prepare prompt for LLM
            prompt = f"""You are a web scraping assistant. Extract the product description from the following HTML page content.

Product Name: {product_name or 'Unknown'}
URL: {url}

Page Content:
{page_text}

Instructions:
1. Find the main product description (not navigation, footer, or unrelated content)
2. Extract a comprehensive description of the product (minimum 50 characters)
3. If the page shows multiple products (like a search results page), return "NOT_FOUND"
4. Return only the product description text, nothing else
5. If no clear product description is found, return "NOT_FOUND"

Product Description:"""

            # Call OpenAI API
            response = llm_client.chat.completions.create(
                model=llm_model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that extracts product descriptions from web pages."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            description = response.choices[0].message.content.strip()
            
            # Check if LLM returned "NOT_FOUND"
            if description.upper() == "NOT_FOUND" or len(description) < 50:
                return None
            
            return description
            
        except Exception as e:
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
