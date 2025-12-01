#!/usr/bin/env python
"""
Quick script to check the progress of the scraping process.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primini_backend.settings')
django.setup()

from primini_backend.products.models import Product
from django.db.models import Q
from django.db.models.functions import Length

# Get statistics
total = Product.objects.count()
with_desc = Product.objects.exclude(description='').exclude(description__isnull=True).count()
without_desc = total - with_desc

# Get products that need processing (short descriptions)
needs_processing = Product.objects.annotate(
    desc_length=Length('description')
).filter(
    Q(description__isnull=True) | 
    Q(description='') |
    Q(desc_length__lt=50)
).count()

print("=" * 60)
print("SCRAPING PROGRESS REPORT")
print("=" * 60)
print(f"Total products in database: {total:,}")
print(f"Products with descriptions: {with_desc:,} ({with_desc/total*100:.2f}%)")
print(f"Products without descriptions: {without_desc:,} ({without_desc/total*100:.2f}%)")
print(f"Products needing processing: {needs_processing:,}")
print("=" * 60)

if with_desc > 0:
    progress_pct = (with_desc / total) * 100
    print(f"\nProgress: {progress_pct:.2f}% complete")
    
    if needs_processing > 0:
        remaining_pct = (needs_processing / total) * 100
        print(f"Remaining: {remaining_pct:.2f}% to process")
    
    # Estimate time remaining (rough estimate based on 2 sec delay)
    if needs_processing > 0:
        estimated_seconds = needs_processing * 2  # 2 seconds per product
        estimated_hours = estimated_seconds / 3600
        estimated_minutes = (estimated_seconds % 3600) / 60
        print(f"\nEstimated time remaining: ~{int(estimated_hours)}h {int(estimated_minutes)}m")
        print("(Based on 2 second delay per product)")

