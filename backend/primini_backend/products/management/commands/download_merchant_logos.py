from django.core.management.base import BaseCommand
from django.conf import settings
from primini_backend.products.models import Merchant, PriceOffer
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup
import os
from pathlib import Path
from django.utils.text import slugify
import time
import urllib3

# Disable SSL warnings for sites with certificate issues
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Command(BaseCommand):
    help = 'Download merchant logos from their official websites and save them locally'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=int,
            default=10,
            help='Request timeout in seconds (default: 10)'
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=1.0,
            help='Delay between requests in seconds (default: 1.0)'
        )

    def get_merchant_website(self, merchant):
        """Get the actual merchant website, extracting from offer URLs if needed"""
        # First, check if merchant has a valid website (not primini.ma or example.com)
        if merchant.website:
            parsed = urlparse(merchant.website)
            domain = parsed.netloc.replace('www.', '')
            if domain and domain not in ['primini.ma', 'example.com']:
                return merchant.website
        
        # Try to extract from offer URLs
        offers = PriceOffer.objects.filter(merchant=merchant).exclude(
            url__isnull=True
        ).exclude(url='')
        
        for offer in offers[:5]:  # Check first 5 offers
            try:
                parsed = urlparse(offer.url)
                domain = parsed.netloc.replace('www.', '')
                if domain and domain not in ['primini.ma', 'example.com']:
                    # Construct base URL
                    scheme = parsed.scheme or 'https'
                    return f"{scheme}://{parsed.netloc}"
            except:
                continue
        
        return merchant.website  # Fallback to original website

    def handle(self, *args, **options):
        timeout = options['timeout']
        delay = options['delay']
        
        # Ensure media/merchants directory exists
        media_root = Path(settings.MEDIA_ROOT)
        merchants_dir = media_root / 'merchants'
        merchants_dir.mkdir(parents=True, exist_ok=True)
        
        # Get all merchants
        merchants = Merchant.objects.all().order_by('name')
        
        self.stdout.write(f'Found {merchants.count()} merchants')
        
        success_count = 0
        failed_count = 0
        skipped_count = 0
        
        for merchant in merchants:
            # Get actual website URL
            actual_website = self.get_merchant_website(merchant)
            
            if not actual_website or actual_website in ['https://primini.ma', 'http://primini.ma', 'https://example.com']:
                self.stdout.write(f'\nSkipping: {merchant.name} (no official website found)')
                skipped_count += 1
                continue
            
            self.stdout.write(f'\nProcessing: {merchant.name} ({actual_website})')
            
            try:
                logo_url = self.find_logo(actual_website, timeout)
                
                if logo_url:
                    filename = self.download_logo(logo_url, merchant, merchants_dir, timeout)
                    if filename:
                        # Update merchant with local logo path
                        merchant.logo = f'/media/merchants/{filename}'
                        merchant.save(update_fields=['logo'])
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ Downloaded and saved: {filename}')
                        )
                        success_count += 1
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'  ✗ Failed to download logo from {logo_url}')
                        )
                        failed_count += 1
                else:
                    self.stdout.write(
                        self.style.WARNING(f'  ✗ Could not find logo on website')
                    )
                    failed_count += 1
                
                # Delay between requests to be respectful
                time.sleep(delay)
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Error: {str(e)}')
                )
                failed_count += 1
        
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted: {success_count} successful, {failed_count} failed, {skipped_count} skipped'
            )
        )

    def find_logo(self, website_url, timeout):
        """Find logo URL on merchant website"""
        try:
            # Try multiple user agents
            user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ]
            
            parsed = urlparse(website_url)
            base_url = f"{parsed.scheme}://{parsed.netloc}"
            
            # First, try common logo paths directly (faster and less likely to be blocked)
            common_paths = [
                '/logo.png',
                '/logo.jpg',
                '/logo.svg',
                '/images/logo.png',
                '/images/logo.jpg',
                '/images/logo.svg',
                '/assets/logo.png',
                '/assets/logo.jpg',
                '/assets/logo.svg',
                '/static/logo.png',
                '/static/logo.jpg',
                '/static/logo.svg',
                '/img/logo.png',
                '/img/logo.jpg',
                '/img/logo.svg',
            ]
            
            for path in common_paths:
                logo_url = f"{base_url}{path}"
                if self.check_url_exists(logo_url, timeout):
                    return logo_url
            
            # If direct paths don't work, try scraping the page
            for user_agent in user_agents:
                try:
                    headers = {
                        'User-Agent': user_agent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                    }
                    
                    session = requests.Session()
                    session.headers.update(headers)
                    
                    response = session.get(website_url, timeout=timeout, allow_redirects=True, verify=False)
                    if response.status_code == 200:
                        break
                except:
                    continue
            else:
                # If all user agents failed, try one more time with basic headers
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = requests.get(website_url, headers=headers, timeout=timeout, allow_redirects=True, verify=False)
            
            if response.status_code != 200:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            base_url = response.url
            
            # Common logo selectors
            logo_selectors = [
                ('img', {'class': lambda x: x and ('logo' in x.lower() or 'brand' in x.lower())}),
                ('img', {'id': lambda x: x and ('logo' in x.lower() or 'brand' in x.lower())}),
                ('img', {'alt': lambda x: x and ('logo' in x.lower() or 'brand' in x.lower())}),
                ('img', {'src': lambda x: x and ('logo' in x.lower() or 'brand' in x.lower())}),
            ]
            
            # Try to find logo using common selectors
            for tag, attrs in logo_selectors:
                logos = soup.find_all(tag, attrs)
                for logo in logos:
                    src = logo.get('src') or logo.get('data-src') or logo.get('data-lazy-src')
                    if src:
                        logo_url = urljoin(base_url, src)
                        # Filter out very small images (likely icons, not logos)
                        if self.is_valid_logo(logo_url, logo):
                            return logo_url
            
            # Try to find favicon as fallback
            favicon = soup.find('link', rel=lambda x: x and ('icon' in x.lower() or 'shortcut' in x.lower()))
            if favicon:
                href = favicon.get('href')
                if href:
                    return urljoin(base_url, href)
            
            # Try common logo paths
            parsed = urlparse(base_url)
            common_paths = [
                '/logo.png',
                '/logo.jpg',
                '/images/logo.png',
                '/images/logo.jpg',
                '/assets/logo.png',
                '/assets/logo.jpg',
                '/static/logo.png',
                '/static/logo.jpg',
            ]
            
            for path in common_paths:
                logo_url = f"{parsed.scheme}://{parsed.netloc}{path}"
                if self.check_url_exists(logo_url, timeout):
                    return logo_url
            
            return None
            
        except Exception as e:
            self.stdout.write(f'  Error finding logo: {str(e)}')
            return None

    def is_valid_logo(self, url, img_tag):
        """Check if image is likely a logo (not too small)"""
        # Check width/height attributes
        width = img_tag.get('width')
        height = img_tag.get('height')
        
        if width and height:
            try:
                w = int(str(width).replace('px', ''))
                h = int(str(height).replace('px', ''))
                # Logos are usually at least 50x50
                if w < 30 or h < 30:
                    return False
            except:
                pass
        
        # Filter out common icon/favicon patterns
        url_lower = url.lower()
        if any(x in url_lower for x in ['favicon', 'icon-', '-icon', 'apple-touch']):
            return False
        
        return True

    def check_url_exists(self, url, timeout):
        """Check if URL exists without downloading full content"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.head(url, headers=headers, timeout=timeout, allow_redirects=True, verify=False)
            return response.status_code == 200
        except:
            return False

    def download_logo(self, logo_url, merchant, merchants_dir, timeout):
        """Download logo and save it locally"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(logo_url, headers=headers, timeout=timeout, stream=True, verify=False)
            response.raise_for_status()
            
            # Check content type
            content_type = response.headers.get('content-type', '').lower()
            
            # Determine file extension
            ext = 'png'  # default
            if 'jpeg' in content_type or 'jpg' in content_type:
                ext = 'jpg'
            elif 'png' in content_type:
                ext = 'png'
            elif 'webp' in content_type:
                ext = 'webp'
            elif 'gif' in content_type:
                ext = 'gif'
            elif 'svg' in content_type:
                ext = 'svg'
            else:
                # Try to get extension from URL
                parsed = urlparse(logo_url)
                path_ext = os.path.splitext(parsed.path)[1].lower()
                if path_ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']:
                    ext = path_ext[1:]  # Remove the dot
            
            # Create filename from merchant name
            filename = f"{slugify(merchant.name)}.{ext}"
            filepath = merchants_dir / filename
            
            # Download and save
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            # Check file size (skip if too small or too large)
            file_size = filepath.stat().st_size
            if file_size < 100:  # Less than 100 bytes is likely not a valid image
                filepath.unlink()
                return None
            if file_size > 10 * 1024 * 1024:  # More than 10MB is likely not a logo
                filepath.unlink()
                return None
            
            return filename
            
        except Exception as e:
            self.stdout.write(f'  Error downloading logo: {str(e)}')
            return None

