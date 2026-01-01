from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from primini_backend.products.models import Merchant, PriceOffer
from difflib import SequenceMatcher
import unicodedata
import os


def normalize_string(s):
    """Normalize string for comparison (remove accents, lowercase, strip)"""
    if not s:
        return ""
    # Remove accents
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return s.lower().strip()


def similarity(a, b):
    """Calculate similarity between two strings (0-1)"""
    return SequenceMatcher(None, normalize_string(a), normalize_string(b)).ratio()


def has_local_logo(merchant):
    """Check if merchant has a local logo file (starts with /media/merchants or merchants/)"""
    # Check logo_file field (ImageField)
    if merchant.logo_file:
        logo_path = str(merchant.logo_file)
        if logo_path.startswith('merchants/') or logo_path.startswith('/media/merchants/'):
            return True
    
    # Check logo field (URLField) - might contain local path
    if merchant.logo:
        logo_path = str(merchant.logo)
        if logo_path.startswith('/media/merchants/') or logo_path.startswith('merchants/'):
            return True
    
    return False


def find_merchant_duplicates(threshold=0.85):
    """Find duplicate merchants based on name similarity"""
    duplicates = []
    merchants = Merchant.objects.annotate(
        offer_count=Count('offers')
    ).order_by('name')
    
    processed = set()
    
    for i, merchant1 in enumerate(merchants):
        if merchant1.id in processed:
            continue
        
        similar = [merchant1]
        for merchant2 in merchants[i+1:]:
            if merchant2.id in processed:
                continue
            
            # Check similarity
            sim = similarity(merchant1.name, merchant2.name)
            # Also check if one name contains the other (for cases like "ALPHAX" and "ALPHAX Maroc")
            name1_norm = normalize_string(merchant1.name)
            name2_norm = normalize_string(merchant2.name)
            is_substring_match = (
                name1_norm in name2_norm or name2_norm in name1_norm
            ) and len(name1_norm) > 3 and len(name2_norm) > 3  # Avoid matching very short names
            
            if sim >= threshold or is_substring_match:
                similar.append(merchant2)
                processed.add(merchant2.id)
        
        if len(similar) > 1:
            duplicates.append(similar)
            processed.add(merchant1.id)
    
    return duplicates


class Command(BaseCommand):
    help = 'Merge duplicate merchants, keeping the one with local logo (/media/merchants)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )
        parser.add_argument(
            '--similarity-threshold',
            type=float,
            default=0.85,
            help='Similarity threshold for considering merchants as duplicates (0-1, default: 0.85)',
        )
        parser.add_argument(
            '--auto-merge',
            action='store_true',
            help='Automatically merge merchants without confirmation',
        )

    def choose_main_merchant(self, merchants):
        """Choose the main merchant to keep - prioritize local logo"""
        # First, check for merchants with local logos
        merchants_with_local_logo = [m for m in merchants if has_local_logo(m)]
        
        if merchants_with_local_logo:
            # If multiple have local logos, prefer the one with more offers
            if len(merchants_with_local_logo) > 1:
                merchants_with_local_logo.sort(
                    key=lambda m: (m.offers.count(), -m.id),
                    reverse=True
                )
            return merchants_with_local_logo[0]
        
        # If no local logos, prefer the one with more offers
        merchants.sort(
            key=lambda m: (m.offers.count(), -m.id),
            reverse=True
        )
        return merchants[0]

    def merge_merchants(self, merchants, dry_run=False):
        """Merge multiple merchants into the main one (chosen by logo priority)"""
        if len(merchants) < 2:
            return {'moved': 0, 'skipped': 0, 'deleted': 0}
        
        main = self.choose_main_merchant(merchants)
        redundant = [m for m in merchants if m.id != main.id]
        
        stats = {'moved': 0, 'skipped': 0, 'deleted': 0}
        
        self.stdout.write(f'\n  Keeping: {main.name} (ID: {main.id})')
        if has_local_logo(main):
            self.stdout.write(self.style.SUCCESS(f'    ✓ Has local logo: {main.logo_file}'))
        else:
            self.stdout.write(self.style.WARNING(f'    ⚠ No local logo'))
        
        for redundant_merchant in redundant:
            self.stdout.write(f'  Removing: {redundant_merchant.name} (ID: {redundant_merchant.id})')
            if has_local_logo(redundant_merchant):
                self.stdout.write(self.style.WARNING(f'    ⚠ Has local logo: {redundant_merchant.logo_file}'))
            else:
                self.stdout.write(f'    - No local logo')
            
            if dry_run:
                # Count what would be moved
                offers_count = redundant_merchant.offers.count()
                self.stdout.write(f'    Would move: {offers_count} offers')
                stats['moved'] += offers_count
            else:
                # Move offers, handling duplicates
                offers = redundant_merchant.offers.all()
                moved_count = 0
                skipped_count = 0
                
                for offer in offers:
                    # Check if main merchant already has an offer for this product
                    existing_offer = PriceOffer.objects.filter(
                        product=offer.product,
                        merchant=main
                    ).first()
                    
                    if existing_offer:
                        # Keep the one with better price (lower) or more recent
                        if offer.price < existing_offer.price or (
                            offer.price == existing_offer.price and 
                            offer.date_updated > existing_offer.date_updated
                        ):
                            # Update existing offer with better data
                            existing_offer.price = offer.price
                            existing_offer.currency = offer.currency or existing_offer.currency
                            existing_offer.stock_status = offer.stock_status
                            existing_offer.url = offer.url or existing_offer.url
                            existing_offer.date_updated = offer.date_updated
                            existing_offer.save()
                        # Delete the redundant offer
                        offer.delete()
                        skipped_count += 1
                    else:
                        # No conflict, can safely move
                        offer.merchant = main
                        offer.save()
                        moved_count += 1
                
                # Update main merchant info if redundant has better data
                updated = False
                # Only update logo if main doesn't have one
                if not main.logo_file and redundant_merchant.logo_file:
                    main.logo_file = redundant_merchant.logo_file
                    updated = True
                if not main.logo and redundant_merchant.logo:
                    main.logo = redundant_merchant.logo
                    updated = True
                if not main.website and redundant_merchant.website:
                    main.website = redundant_merchant.website
                    updated = True
                if not main.description and redundant_merchant.description:
                    main.description = redundant_merchant.description
                    updated = True
                if updated:
                    main.save()
                
                # Delete redundant merchant
                redundant_merchant.delete()
                stats['deleted'] += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'    ✓ Moved {moved_count} offers, skipped {skipped_count} duplicates'
                    )
                )
                stats['moved'] += moved_count
                stats['skipped'] += skipped_count
        
        return stats

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        threshold = options['similarity_threshold']
        auto_merge = options['auto_merge']
        
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('Merge Duplicate Merchants by Logo'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN MODE - No changes will be made\n'))
        
        # Find duplicate merchants
        self.stdout.write('\n📋 Finding duplicate merchants...')
        duplicates = find_merchant_duplicates(threshold)
        
        if not duplicates:
            self.stdout.write(self.style.SUCCESS('  ✓ No duplicate merchants found'))
            return
        
        self.stdout.write(f'\nFound {len(duplicates)} groups of duplicate merchants:')
        total_redundant = 0
        total_stats = {'moved': 0, 'skipped': 0, 'deleted': 0}
        
        for idx, group in enumerate(duplicates, 1):
            self.stdout.write(f'\n  Group {idx} ({len(group)} merchants):')
            for merchant in group:
                offers_count = merchant.offers.count()
                logo_info = ''
                if has_local_logo(merchant):
                    if merchant.logo_file:
                        logo_info = f' [LOCAL LOGO: {merchant.logo_file}]'
                    elif merchant.logo:
                        logo_info = f' [LOCAL LOGO: {merchant.logo}]'
                elif merchant.logo_file:
                    logo_info = f' [logo_file: {merchant.logo_file}]'
                elif merchant.logo:
                    logo_info = f' [logo URL: {merchant.logo[:50]}...]'
                else:
                    logo_info = ' [no logo]'
                
                self.stdout.write(
                    f'    - {merchant.name} (ID: {merchant.id}) - '
                    f'{offers_count} offers{logo_info}'
                )
            total_redundant += len(group) - 1  # All except the main one
        
        self.stdout.write(f'\n  Total redundant merchants to merge: {total_redundant}')
        
        if not dry_run:
            if auto_merge or input('\n  Proceed with merging? (yes/no): ').lower() == 'yes':
                self.stdout.write('\n🔄 Merging duplicate merchants...')
                for idx, group in enumerate(duplicates, 1):
                    self.stdout.write(f'\nProcessing group {idx}/{len(duplicates)}:')
                    stats = self.merge_merchants(group, dry_run=False)
                    total_stats['moved'] += stats['moved']
                    total_stats['skipped'] += stats['skipped']
                    total_stats['deleted'] += stats['deleted']
                
                self.stdout.write(self.style.SUCCESS('\n' + '=' * 70))
                self.stdout.write(self.style.SUCCESS('MERGE COMPLETE'))
                self.stdout.write(self.style.SUCCESS('=' * 70))
                self.stdout.write(f'\n📊 Statistics:')
                self.stdout.write(f'  Merchants deleted: {total_stats["deleted"]}')
                self.stdout.write(f'  Offers moved: {total_stats["moved"]}')
                self.stdout.write(f'  Duplicate offers skipped: {total_stats["skipped"]}')
            else:
                self.stdout.write(self.style.WARNING('\n✗ Merging cancelled'))
        else:
            self.stdout.write('\n📊 Summary (DRY RUN):')
            self.stdout.write(f'  Would delete: {total_redundant} merchants')
        
        # Final stats
        total_merchants = Merchant.objects.count()
        merchants_with_offers = Merchant.objects.annotate(
            offer_count=Count('offers')
        ).filter(offer_count__gt=0).count()
        merchants_with_local_logo = sum(1 for m in Merchant.objects.all() if has_local_logo(m))
        
        self.stdout.write(f'\n📊 Final statistics:')
        self.stdout.write(f'  Total merchants: {total_merchants}')
        self.stdout.write(f'  Merchants with offers: {merchants_with_offers}')
        self.stdout.write(f'  Merchants with local logos: {merchants_with_local_logo}')

