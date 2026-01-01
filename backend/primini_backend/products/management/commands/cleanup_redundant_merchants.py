from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from primini_backend.products.models import Merchant, PriceOffer
from difflib import SequenceMatcher
import unicodedata


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


class Command(BaseCommand):
    help = 'Remove redundant merchants by merging duplicates'

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

    def find_duplicate_merchants(self, threshold=0.85):
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
                if sim >= threshold:
                    similar.append(merchant2)
                    processed.add(merchant2.id)
            
            if len(similar) > 1:
                # Choose the one with more offers as the main merchant
                similar.sort(key=lambda m: (
                    m.offer_count,
                    -m.id  # Prefer newer (higher ID) if same offer count
                ), reverse=True)
                duplicates.append(similar)
                processed.add(merchant1.id)
        
        return duplicates

    def merge_merchants(self, merchants, dry_run=False):
        """Merge multiple merchants into the first one (main merchant)"""
        if len(merchants) < 2:
            return
        
        main = merchants[0]
        redundant = merchants[1:]
        
        self.stdout.write(f'\n  Merging into: {main.name} (ID: {main.id})')
        
        for redundant_merchant in redundant:
            self.stdout.write(f'    - {redundant_merchant.name} (ID: {redundant_merchant.id})')
            
            if dry_run:
                # Count what would be moved
                offers_count = redundant_merchant.offers.count()
                self.stdout.write(f'      Would move: {offers_count} offers')
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
                if not main.website and redundant_merchant.website:
                    main.website = redundant_merchant.website
                    updated = True
                if not main.logo and redundant_merchant.logo:
                    main.logo = redundant_merchant.logo
                    updated = True
                if not main.description and redundant_merchant.description:
                    main.description = redundant_merchant.description
                    updated = True
                if updated:
                    main.save()
                
                # Delete redundant merchant
                redundant_merchant.delete()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'      ✓ Moved {moved_count} offers, skipped {skipped_count} duplicates'
                    )
                )

    def find_empty_merchants(self):
        """Find merchants with no offers"""
        return Merchant.objects.annotate(
            offer_count=Count('offers')
        ).filter(offer_count=0)

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        threshold = options['similarity_threshold']
        auto_merge = options['auto_merge']
        
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('Merchant Cleanup Tool'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN MODE - No changes will be made\n'))
        
        # Step 1: Find duplicate merchants
        self.stdout.write('\n📋 Step 1: Finding duplicate merchants...')
        duplicates = self.find_duplicate_merchants(threshold)
        
        if duplicates:
            self.stdout.write(f'\nFound {len(duplicates)} groups of duplicate merchants:')
            total_redundant = 0
            for group in duplicates:
                self.stdout.write(f'\n  Group ({len(group)} merchants):')
                for merchant in group:
                    offers_count = merchant.offers.count()
                    self.stdout.write(
                        f'    - {merchant.name} (ID: {merchant.id}) - '
                        f'{offers_count} offers'
                    )
                total_redundant += len(group) - 1  # All except the main one
            
            self.stdout.write(f'\n  Total redundant merchants to merge: {total_redundant}')
            
            if not dry_run:
                if auto_merge or input('\n  Proceed with merging? (yes/no): ').lower() == 'yes':
                    self.stdout.write('\n🔄 Merging duplicate merchants...')
                    for group in duplicates:
                        self.merge_merchants(group, dry_run=False)
                    self.stdout.write(self.style.SUCCESS(f'\n✓ Merged {total_redundant} redundant merchants'))
                else:
                    self.stdout.write(self.style.WARNING('\n✗ Merging cancelled'))
        else:
            self.stdout.write(self.style.SUCCESS('  ✓ No duplicate merchants found'))
        
        # Step 2: Find empty merchants
        self.stdout.write('\n📋 Step 2: Finding empty merchants (no offers)...')
        empty_merchants = self.find_empty_merchants()
        
        if empty_merchants.exists():
            self.stdout.write(f'\nFound {empty_merchants.count()} empty merchants:')
            for merchant in empty_merchants:
                self.stdout.write(f'  - {merchant.name} (ID: {merchant.id})')
            
            if not dry_run:
                if auto_merge or input('\n  Delete empty merchants? (yes/no): ').lower() == 'yes':
                    count = empty_merchants.count()
                    empty_merchants.delete()
                    self.stdout.write(self.style.SUCCESS(f'\n✓ Deleted {count} empty merchants'))
                else:
                    self.stdout.write(self.style.WARNING('\n✗ Deletion cancelled'))
        else:
            self.stdout.write(self.style.SUCCESS('  ✓ No empty merchants found'))
        
        # Summary
        self.stdout.write('\n' + '=' * 70)
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN COMPLETE - No changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS('CLEANUP COMPLETE'))
        self.stdout.write('=' * 70)
        
        # Final stats
        total_merchants = Merchant.objects.count()
        merchants_with_offers = Merchant.objects.annotate(
            offer_count=Count('offers')
        ).filter(offer_count__gt=0).count()
        
        self.stdout.write(f'\nFinal statistics:')
        self.stdout.write(f'  Total merchants: {total_merchants}')
        self.stdout.write(f'  Merchants with offers: {merchants_with_offers}')

