"""Update products and offers from data/*_with_descriptions.json files."""
import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from difflib import SequenceMatcher

from primini_backend.products.models import Category, Merchant, Product, PriceOffer
from primini_backend.products.utils.import_utils import (
    parse_price,
    get_raw_price_text,
    detect_currency,
    extract_domain,
    extract_slug_from_primini_url,
    extract_slug_variants_from_primini_url,
    normalize_merchant_name,
    map_stock_status,
)

# Category folder (data/) -> parent category slug in DB
CATEGORY_FOLDER_MAP = {
    "electromenager": "electromenager",
    "informatique": "informatique",
    "petit_electromenager": "petit-electromenager",
    "telephonie": "telephonie",
    "sante_beaute": "sante-beaute",
    "photo_camera": "photo-camera",
}

# Filename stem -> subcategory slug (when different)
SUBCATEGORY_SLUG_OVERRIDES = {
    "refrigerateurs": "refrigerateurs-et-congelateurs",
    "congelateurs": "refrigerateurs-et-congelateurs",
}


def filename_to_subcategory_slug(filename_stem):
    """Convert filename like 'machine_a__laver' or 'chauffages' to DB slug."""
    override = SUBCATEGORY_SLUG_OVERRIDES.get(filename_stem)
    if override:
        return override
    # Replace __ with - then slugify (handles machine_a__laver -> machine-a-laver)
    normalized = filename_stem.replace("__", "-").replace("_", "-")
    return slugify(normalized) or filename_stem


def similarity(a, b):
    """Calculate similarity between two strings (0-1)."""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


class Command(BaseCommand):
    help = "Update products and offers from data/*_with_descriptions.json files"

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
            help="Show what would be updated without making changes",
        )
        parser.add_argument(
            "--products-only",
            action="store_true",
            help="Skip PriceOffer updates",
        )
        parser.add_argument(
            "--offers-only",
            action="store_true",
            help="Skip Product description/image updates",
        )
        parser.add_argument(
            "--category",
            type=str,
            help="Limit to one category folder (e.g. electromenager)",
        )
        parser.add_argument(
            "--file",
            type=str,
            help="Limit to one JSON file (e.g. chauffages_with_descriptions.json)",
        )
        parser.add_argument(
            "--similarity-threshold",
            type=float,
            default=0.85,
            help="Similarity threshold for name-based product matching (0-1, default: 0.85)",
        )

    def handle(self, *args, **options):
        data_dir = options["data_dir"]
        if data_dir is None:
            # Default: project root data/ (backend/../data)
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
        products_only = options["products_only"]
        offers_only = options["offers_only"]
        category_filter = options.get("category")
        file_filter = options.get("file")
        similarity_threshold = options["similarity_threshold"]

        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("Update from data JSON"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN - No changes will be made\n"))

        stats = {
            "files_processed": 0,
            "products_matched": 0,
            "products_updated": 0,
            "products_not_found": 0,
            "offers_created": 0,
            "offers_updated": 0,
            "merchants_created": 0,
        }

        json_files = self._collect_json_files(data_path, category_filter, file_filter)
        self.stdout.write(f"Found {len(json_files)} JSON file(s) to process\n")

        for json_path in json_files:
            self._process_file(
                json_path,
                data_path,
                stats,
                dry_run,
                products_only,
                offers_only,
                similarity_threshold,
            )

        self._print_summary(stats, dry_run)

    def _collect_json_files(self, data_path, category_filter, file_filter):
        """Collect *_with_descriptions.json files."""
        files = []
        for item in data_path.iterdir():
            if not item.is_dir():
                continue
            cat_name = item.name
            if category_filter and cat_name != category_filter:
                continue
            for f in item.glob("*_with_descriptions.json"):
                if file_filter and f.name != file_filter:
                    continue
                files.append(f)
        return sorted(files)

    def _process_file(
        self,
        json_path,
        data_path,
        stats,
        dry_run,
        products_only,
        offers_only,
        similarity_threshold,
    ):
        """Process a single JSON file."""
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                products_data = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            self.stdout.write(self.style.ERROR(f"  Error reading {json_path.name}: {e}"))
            return

        if not isinstance(products_data, list):
            self.stdout.write(
                self.style.WARNING(f"  Skipping {json_path.name}: not a list")
            )
            return

        # Derive category and subcategory from path
        rel_parts = json_path.relative_to(data_path).parts
        category_folder = rel_parts[0] if rel_parts else ""
        filename_stem = json_path.stem.replace("_with_descriptions", "")
        parent_slug = CATEGORY_FOLDER_MAP.get(
            category_folder, slugify(category_folder.replace("_", " "))
        )
        subcategory_slug = filename_to_subcategory_slug(filename_stem)

        parent_cat = Category.objects.filter(slug=parent_slug, parent__isnull=True).first()
        sub_cat = None
        if parent_cat:
            sub_cat = Category.objects.filter(
                slug=subcategory_slug, parent=parent_cat
            ).first()
            if not sub_cat:
                sub_cat = Category.objects.filter(
                    slug=subcategory_slug, parent__isnull=False
                ).first()

        stats["files_processed"] += 1
        self.stdout.write(f"  Processing {json_path.name} ({len(products_data)} products)")

        for idx, product_data in enumerate(products_data):
            if (idx + 1) % 100 == 0:
                self.stdout.write(f"    ... {idx + 1}/{len(products_data)}")
            try:
                with transaction.atomic():
                    self._process_product(
                        product_data,
                        parent_cat,
                        sub_cat,
                        stats,
                        dry_run,
                        products_only,
                        offers_only,
                        similarity_threshold,
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f"    Error on product: {e}")
                )

    def _process_product(
        self,
        data,
        parent_cat,
        sub_cat,
        stats,
        dry_run,
        products_only,
        offers_only,
        similarity_threshold,
    ):
        """Process a single product entry."""
        name = (data.get("name") or "").strip()
        if not name:
            return

        product = self._find_product(data, similarity_threshold)
        if not product:
            stats["products_not_found"] += 1
            return

        stats["products_matched"] += 1

        if not offers_only:
            updated = self._update_product(
                product, data, parent_cat, sub_cat, dry_run
            )
            if updated:
                stats["products_updated"] += 1

        if not products_only and product:
            for offer_data in data.get("offers_detail") or []:
                created, updated = self._upsert_offer(
                    product, offer_data, stats, dry_run
                )
                if created:
                    stats["offers_created"] += 1
                elif updated:
                    stats["offers_updated"] += 1

    def _find_product(self, data, threshold):
        """Find Product by slug from URL, or fallback to name/similarity."""
        for slug in extract_slug_variants_from_primini_url(data.get("url") or ""):
            product = Product.objects.filter(slug=slug).first()
            if product:
                return product

        name = (data.get("name") or "").strip()
        if not name:
            return None

        # Try slugified name
        product_slug = slugify(name[:200])
        if product_slug:
            product = Product.objects.filter(slug=product_slug).first()
            if product:
                return product

        # Fallback: name similarity
        for p in Product.objects.all():
            if similarity(p.name, name) >= threshold:
                return p
        return None

    def _update_product(self, product, data, parent_cat, sub_cat, dry_run):
        """Update product description, image, category if applicable."""
        updated = False
        json_desc = (data.get("description") or "").strip()
        json_image = (data.get("image") or "").strip()

        if json_desc and len(json_desc) >= 50:
            if not product.description or len(json_desc) > len(product.description or ""):
                if not dry_run:
                    product.description = json_desc
                    product.save(update_fields=["description"])
                updated = True

        if json_image:
            if not product.image or product.image != json_image:
                if not dry_run:
                    product.image = json_image
                    product.save(update_fields=["image"])
                updated = True

        if parent_cat and not product.category:
            if not dry_run:
                product.category = parent_cat
                product.save(update_fields=["category"])
            updated = True

        if sub_cat and not product.subcategory:
            if not dry_run:
                product.subcategory = sub_cat
                product.save(update_fields=["subcategory"])
            updated = True

        return updated

    def _upsert_offer(self, product, offer_data, stats, dry_run):
        """Create or update PriceOffer from offers_detail entry."""
        boutique = (offer_data.get("boutique") or "").strip()
        if not boutique:
            return False, False

        merchant = self._get_or_create_merchant(
            boutique,
            offer_data.get("lien_offre") or "",
            stats,
            dry_run,
        )
        if not merchant:
            return False, False

        prix_str = offer_data.get("prix") or ""
        price = parse_price(prix_str)
        if price <= 0:
            return False, False

        stock_status = map_stock_status(offer_data.get("etat_stock"))
        offer_url = (offer_data.get("lien_offre") or "").strip()
        currency = detect_currency(prix_str)
        raw_price_text = get_raw_price_text(prix_str)

        if dry_run:
            return True, True  # Count as would-be upsert

        defaults = {
            "price": price,
            "stock_status": stock_status,
            "url": offer_url,
            "currency": currency,
            "raw_price_text": raw_price_text,
        }
        offer, created = PriceOffer.objects.update_or_create(
            product=product,
            merchant=merchant,
            defaults=defaults,
        )
        return created, not created

    def _get_or_create_merchant(self, boutique_name, offer_url, stats, dry_run):
        """Resolve Merchant by boutique name (exact, without Maroc, first token)."""
        variants = normalize_merchant_name(boutique_name)
        for v in variants:
            merchant = Merchant.objects.filter(name__iexact=v).first()
            if merchant:
                return merchant

        if dry_run:
            return None  # Would create, but in dry-run we skip

        merchant, created = Merchant.objects.get_or_create(
            name=variants[0],
            defaults={"website": extract_domain(offer_url)},
        )
        if created:
            stats["merchants_created"] += 1
        return merchant

    def _print_summary(self, stats, dry_run):
        """Print final statistics."""
        self.stdout.write("\n" + "=" * 60)
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN COMPLETE - No changes made"))
        else:
            self.stdout.write(self.style.SUCCESS("COMPLETE"))
        self.stdout.write("=" * 60)
        self.stdout.write("\nStatistics:")
        self.stdout.write(f"  Files processed:     {stats['files_processed']}")
        self.stdout.write(f"  Products matched:    {stats['products_matched']}")
        self.stdout.write(f"  Products updated:    {stats['products_updated']}")
        self.stdout.write(f"  Products not found:  {stats['products_not_found']}")
        self.stdout.write(f"  Offers created:      {stats['offers_created']}")
        self.stdout.write(f"  Offers updated:      {stats['offers_updated']}")
        self.stdout.write(f"  Merchants created:   {stats['merchants_created']}")
