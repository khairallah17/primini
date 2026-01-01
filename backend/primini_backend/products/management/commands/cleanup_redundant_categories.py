from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q, Count
from primini_backend.products.models import Category, Product
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
    help = 'Remove redundant categories and subcategories by merging duplicates'

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
            help='Similarity threshold for considering categories as duplicates (0-1, default: 0.85)',
        )
        parser.add_argument(
            '--auto-merge',
            action='store_true',
            help='Automatically merge categories without confirmation',
        )

    def find_duplicate_categories(self, threshold=0.85):
        """Find duplicate categories based on name similarity and same parent"""
        duplicates = []
        categories = Category.objects.all().order_by('parent_id', 'name')
        
        # Group by parent for better comparison
        parent_groups = {}
        for cat in categories:
            parent_id = cat.parent_id if cat.parent else None
            if parent_id not in parent_groups:
                parent_groups[parent_id] = []
            parent_groups[parent_id].append(cat)
        
        processed = set()
        
        for parent_id, cats in parent_groups.items():
            for i, cat1 in enumerate(cats):
                if cat1.id in processed:
                    continue
                
                similar = [cat1]
                for cat2 in cats[i+1:]:
                    if cat2.id in processed:
                        continue
                    
                    # Check similarity
                    sim = similarity(cat1.name, cat2.name)
                    if sim >= threshold:
                        similar.append(cat2)
                        processed.add(cat2.id)
                
                if len(similar) > 1:
                    # Choose the one with more products as the main category
                    similar.sort(key=lambda c: (
                        c.products.count() + c.subcategory_products.count(),
                        -c.id  # Prefer newer (higher ID) if same product count
                    ), reverse=True)
                    duplicates.append(similar)
                    processed.add(cat1.id)
        
        return duplicates

    def merge_categories(self, categories, dry_run=False):
        """Merge multiple categories into the first one (main category)"""
        if len(categories) < 2:
            return
        
        main = categories[0]
        redundant = categories[1:]
        
        self.stdout.write(f'\n  Merging into: {main.name} (ID: {main.id}, slug: {main.slug})')
        
        for redundant_cat in redundant:
            self.stdout.write(f'    - {redundant_cat.name} (ID: {redundant_cat.id}, slug: {redundant_cat.slug})')
            
            if dry_run:
                # Count what would be moved
                products_count = redundant_cat.products.count()
                subcategory_products_count = redundant_cat.subcategory_products.count()
                children_count = redundant_cat.children.count()
                self.stdout.write(f'      Would move: {products_count} products, {subcategory_products_count} subcategory products, {children_count} subcategories')
            else:
                # Move products
                products_count = redundant_cat.products.count()
                Product.objects.filter(category=redundant_cat).update(category=main)
                
                # Move subcategory products
                subcategory_products_count = redundant_cat.subcategory_products.count()
                Product.objects.filter(subcategory=redundant_cat).update(subcategory=main)
                
                # Move children (subcategories)
                children_count = redundant_cat.children.count()
                Category.objects.filter(parent=redundant_cat).update(parent=main)
                
                # Delete redundant category
                redundant_cat.delete()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'      ✓ Moved {products_count} products, {subcategory_products_count} subcategory products, {children_count} subcategories'
                    )
                )

    def find_empty_categories(self):
        """Find categories with no products and no children"""
        return Category.objects.annotate(
            product_count=Count('products'),
            subcategory_product_count=Count('subcategory_products'),
            children_count=Count('children')
        ).filter(
            product_count=0,
            subcategory_product_count=0,
            children_count=0
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        threshold = options['similarity_threshold']
        auto_merge = options['auto_merge']
        
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('Category Cleanup Tool'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN MODE - No changes will be made\n'))
        
        # Step 1: Find duplicate categories
        self.stdout.write('\n📋 Step 1: Finding duplicate categories...')
        duplicates = self.find_duplicate_categories(threshold)
        
        if duplicates:
            self.stdout.write(f'\nFound {len(duplicates)} groups of duplicate categories:')
            total_redundant = 0
            for group in duplicates:
                self.stdout.write(f'\n  Group ({len(group)} categories):')
                for cat in group:
                    products_count = cat.products.count()
                    subcategory_products_count = cat.subcategory_products.count()
                    children_count = cat.children.count()
                    self.stdout.write(
                        f'    - {cat.name} (ID: {cat.id}, slug: {cat.slug}) - '
                        f'{products_count} products, {subcategory_products_count} subcategory products, {children_count} children'
                    )
                total_redundant += len(group) - 1  # All except the main one
            
            self.stdout.write(f'\n  Total redundant categories to merge: {total_redundant}')
            
            if not dry_run:
                if auto_merge or input('\n  Proceed with merging? (yes/no): ').lower() == 'yes':
                    self.stdout.write('\n🔄 Merging duplicate categories...')
                    for group in duplicates:
                        self.merge_categories(group, dry_run=False)
                    self.stdout.write(self.style.SUCCESS(f'\n✓ Merged {total_redundant} redundant categories'))
                else:
                    self.stdout.write(self.style.WARNING('\n✗ Merging cancelled'))
        else:
            self.stdout.write(self.style.SUCCESS('  ✓ No duplicate categories found'))
        
        # Step 2: Find empty categories
        self.stdout.write('\n📋 Step 2: Finding empty categories...')
        empty_categories = self.find_empty_categories()
        
        if empty_categories.exists():
            self.stdout.write(f'\nFound {empty_categories.count()} empty categories:')
            for cat in empty_categories:
                parent_name = cat.parent.name if cat.parent else 'None'
                self.stdout.write(f'  - {cat.name} (ID: {cat.id}, slug: {cat.slug}, parent: {parent_name})')
            
            if not dry_run:
                if auto_merge or input('\n  Delete empty categories? (yes/no): ').lower() == 'yes':
                    count = empty_categories.count()
                    empty_categories.delete()
                    self.stdout.write(self.style.SUCCESS(f'\n✓ Deleted {count} empty categories'))
                else:
                    self.stdout.write(self.style.WARNING('\n✗ Deletion cancelled'))
        else:
            self.stdout.write(self.style.SUCCESS('  ✓ No empty categories found'))
        
        # Summary
        self.stdout.write('\n' + '=' * 70)
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN COMPLETE - No changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS('CLEANUP COMPLETE'))
        self.stdout.write('=' * 70)
        
        # Final stats
        total_categories = Category.objects.count()
        parent_categories = Category.objects.filter(parent__isnull=True).count()
        subcategories = Category.objects.filter(parent__isnull=False).count()
        
        self.stdout.write(f'\nFinal statistics:')
        self.stdout.write(f'  Total categories: {total_categories}')
        self.stdout.write(f'  Parent categories: {parent_categories}')
        self.stdout.write(f'  Subcategories: {subcategories}')

