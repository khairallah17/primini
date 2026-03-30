"""Remove PriceOffer entries whose url starts with https://primini.ma/gotostore."""
from django.core.management.base import BaseCommand

from primini_backend.products.models import PriceOffer


class Command(BaseCommand):
    help = "Remove PriceOffer entries whose url starts with https://primini.ma/gotostore"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show count only, do not delete",
        )

    def handle(self, *args, **options):
        prefix = "https://primini.ma/gotostore"
        qs = PriceOffer.objects.filter(url__startswith=prefix)
        count = qs.count()

        if options["dry_run"]:
            self.stdout.write(
                self.style.WARNING(f"DRY RUN: Would delete {count} PriceOffer(s) with url starting with {prefix}")
            )
            return

        deleted, _ = qs.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} PriceOffer(s) with url starting with {prefix}"))
