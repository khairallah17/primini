"""Remove all PriceOffer entries and re-import from data/*_with_descriptions.json files."""
import subprocess
import sys
from pathlib import Path

from django.core.management.base import BaseCommand

from primini_backend.products.models import PriceOffer


class Command(BaseCommand):
    help = "Remove all PriceOffer entries and re-import from data/ JSON files"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would happen without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        count_before = PriceOffer.objects.count()
        self.stdout.write(f"Current PriceOffer count: {count_before}")

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"DRY RUN: Would delete {count_before} PriceOffer(s) and re-import"
            ))
            return

        deleted, _ = PriceOffer.objects.all().delete()
        self.stdout.write(self.style.WARNING(f"Deleted {deleted} PriceOffer(s)"))

        backend_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
        script = backend_dir / "reload_offers_standalone.py"
        if script.exists():
            self.stdout.write("Re-importing offers from data/ JSON files...")
            rc = subprocess.run([sys.executable, str(script)], cwd=str(backend_dir))
            if rc.returncode != 0:
                self.stdout.write(self.style.ERROR("Import script failed"))
        else:
            self.stdout.write(
                self.style.ERROR(
                    "Run: python reload_offers_standalone.py from backend/"
                )
            )
