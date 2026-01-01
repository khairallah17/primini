from django.core.management.base import BaseCommand
from django.db.models import Q
from primini_backend.products.models import Merchant, PriceOffer
from urllib.parse import urlparse
import os
from django.conf import settings


class Command(BaseCommand):
    help = 'Export distinct merchant website links to a .txt file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='merchant_links.txt',
            help='Output file name (default: merchant_links.txt)'
        )

    def handle(self, *args, **options):
        output_file = options['output']
        output_path = os.path.join(settings.BASE_DIR, output_file)
        
        # Get all distinct merchant websites
        merchants = Merchant.objects.exclude(
            Q(website__isnull=True) | Q(website='')
        ).distinct().order_by('name')
        
        # Get all offers with URLs
        offers = PriceOffer.objects.select_related('merchant').exclude(
            Q(url__isnull=True) | Q(url='')
        ).order_by('merchant__name', 'url')
        
        # Collect unique links
        merchant_links = {}
        offer_links_by_merchant = {}
        seen_merchants = set()
        
        # Collect merchant website URLs
        for merchant in merchants:
            if merchant.website:
                domain = self.extract_domain(merchant.website)
                if domain not in merchant_links:
                    merchant_links[domain] = merchant.website
        
        # Collect offer URLs by merchant (one per merchant)
        for offer in offers:
            merchant_name = offer.merchant.name
            if merchant_name not in seen_merchants and offer.url:
                offer_links_by_merchant[merchant_name] = offer.url
                seen_merchants.add(merchant_name)
        
        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("MERCHANT WEBSITE LINKS (Distinct by Domain)\n")
            f.write("=" * 80 + "\n\n")
            
            for domain, url in sorted(merchant_links.items()):
                f.write(f"{domain}\n")
                f.write(f"  URL: {url}\n\n")
            
            f.write("\n" + "=" * 80 + "\n")
            f.write("PRODUCT OFFER LINKS (One per Merchant)\n")
            f.write("=" * 80 + "\n\n")
            
            for merchant_name, url in sorted(offer_links_by_merchant.items()):
                f.write(f"{merchant_name}\n")
                f.write(f"  URL: {url}\n\n")
            
            f.write("\n" + "=" * 80 + "\n")
            f.write("SUMMARY\n")
            f.write("=" * 80 + "\n")
            f.write(f"Total distinct merchant websites: {len(merchant_links)}\n")
            f.write(f"Total distinct offer links (one per merchant): {len(offer_links_by_merchant)}\n")
            f.write(f"Total unique links: {len(merchant_links) + len(offer_links_by_merchant)}\n")
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully exported {len(merchant_links)} merchant websites and '
                f'{len(offer_links_by_merchant)} offer links to {output_path}'
            )
        )
        
        # Print summary
        self.stdout.write(f'\nSummary:')
        self.stdout.write(f'  - Merchant websites: {len(merchant_links)}')
        self.stdout.write(f'  - Offer links (one per merchant): {len(offer_links_by_merchant)}')
        self.stdout.write(f'  - Total unique links: {len(merchant_links) + len(offer_links_by_merchant)}')

    def extract_domain(self, url):
        """Extract domain from URL"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc or parsed.path
            # Remove www. prefix if present
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except Exception:
            return url

