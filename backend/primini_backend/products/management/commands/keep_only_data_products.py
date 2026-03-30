"""Keep only products that exist in data/*_with_descriptions.json files. Delete the rest."""
import json
from pathlib import Path

from django.core.management.base import BaseCommand

from primini_backend.products.models import Product
from primini_backend.products.utils.import_utils import (
    extract_slug_from_primini_url,
    extract_slug_variants_from_primini_url,
)


class Command(BaseCommand):
    help = "Keep only products present in data/ JSON files. Delete all others."

    def add_arguments(self, parser):
        parser.add_argument(
            "data_dir",
            type=str,
            nargs="?",
            default=None,
            help="Path to data directory (default: project data/)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without making changes",
        )

    def handle(self, *args, **options):
        data_dir = options["data_dir"]
        if data_dir is None:
            base = Path(__file__).resolve().parent
            for _ in range(6):
                base = base.parent
                candidate = base / "data"
                if candidate.is_dir():
                    data_dir = str(candidate)
                    break
            else:
                data_dir = "data"
        data_path = Path(data_dir)
        if not data_path.exists():
            self.stdout.write(self.style.ERROR(f"Data directory not found: {data_path}"))
            return

        dry_run = options["dry_run"]

        # Collect all product slugs from data/ JSON files
        keep_slugs = set()
        json_files = list(data_path.glob("*/*_with_descriptions.json"))
        for json_path in json_files:
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    products = json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                self.stdout.write(self.style.WARNING(f"Skipping {json_path.name}: {e}"))
                continue
            if not isinstance(products, list):
                continue
            for p in products:
                url = p.get("url") or ""
                for slug in extract_slug_variants_from_primini_url(url):
                    keep_slugs.add(slug)

        self.stdout.write(f"Found {len(keep_slugs)} product slugs in data/ JSON files")
        self.stdout.write(f"Processed {len(json_files)} JSON files")

        # Find products to delete (slug NOT in keep_slugs)
        all_products = Product.objects.all()
        to_delete = [p for p in all_products if p.slug not in keep_slugs]
        to_keep_count = all_products.count() - len(to_delete)

        self.stdout.write(f"Products to keep: {to_keep_count}")
        self.stdout.write(f"Products to delete: {len(to_delete)}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN - No changes made"))
            return

        if not to_delete:
            self.stdout.write(self.style.SUCCESS("Nothing to delete"))
            return

        deleted, detail = Product.objects.filter(
            slug__in=[p.slug for p in to_delete]
        ).delete()
        self.stdout.write(self.style.SUCCESS(f"\nDeleted {deleted} object(s): {detail}"))
