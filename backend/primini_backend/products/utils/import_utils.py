"""Shared utilities for product/offer import commands."""
import re
from urllib.parse import urlparse

from django.utils.text import slugify


def parse_price(price_str):
    """Parse price string (e.g. '369 DH', '1 460 DH') and convert to float."""
    if not price_str:
        return 0.0

    # Remove currency symbols and spaces
    price_clean = re.sub(r"[^\d.,]", "", str(price_str))

    # Handle different decimal separators
    if "," in price_clean and "." in price_clean:
        price_clean = price_clean.replace(",", "")
    elif "," in price_clean:
        parts = price_clean.split(",")
        if len(parts) == 2 and len(parts[1]) > 2:
            price_clean = price_clean.replace(",", "")
        else:
            price_clean = price_clean.replace(",", ".")

    try:
        return float(price_clean)
    except ValueError:
        return 0.0


def get_raw_price_text(price_value):
    """Return string representation of raw price value."""
    if isinstance(price_value, list):
        return ", ".join(str(v) for v in price_value)
    return str(price_value or "")


def detect_currency(price_value):
    """Detect currency from raw price information."""
    text = get_raw_price_text(price_value).upper()
    if "€" in text or "EUR" in text:
        return "EUR"
    if "USD" in text or "$" in text:
        return "USD"
    if "GBP" in text or "£" in text:
        return "GBP"
    if "MAD" in text or "DH" in text:
        return "MAD"
    return "MAD"


def extract_domain(url):
    """Extract scheme + netloc from URL."""
    if not url:
        return ""
    try:
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}"
    except Exception:
        return ""


def extract_slug_from_primini_url(url):
    """
    Extract product slug from primini.ma URL.
    e.g. https://primini.ma/c/p/141989/De-Longhi-Hva-0220-Appareil-De-Chauffage-...
    -> de-longhi-hva-0220-appareil-de-chauffage-...
    """
    if not url or "primini.ma" not in url:
        return None
    try:
        parsed = urlparse(url)
        path = parsed.path.rstrip("/")
        parts = path.split("/")
        if len(parts) >= 2:
            # Last segment is the slug (PascalCase with hyphens)
            last_segment = parts[-1]
            return slugify(last_segment) or None
    except Exception:
        pass
    return None


def extract_slug_variants_from_primini_url(url):
    """
    Extract all possible slug variants for matching products in DB.
    Some DB slugs use 'delonghi' instead of 'de-longhi'.
    """
    slug = extract_slug_from_primini_url(url)
    if not slug:
        return []
    variants = [slug]
    # DB sometimes has "delonghi" instead of "de-longhi"
    if slug.startswith("de-") and len(slug) > 3:
        variants.append("de" + slug[2:])
    return variants


def normalize_merchant_name(boutique_name):
    """
    Normalize boutique name for matching (e.g. 'Electromall Maroc' -> 'Electromall').
    Returns variants to try for lookup: exact, without 'Maroc', first token.
    """
    if not boutique_name or not boutique_name.strip():
        return []
    name = boutique_name.strip()
    variants = [name]
    # Strip " Maroc" suffix
    if name.endswith(" Maroc"):
        variants.append(name[:-5].strip())
    # First token (e.g. "Electromall" from "Electromall Maroc")
    first = name.split()[0] if name.split() else name
    if first not in variants:
        variants.append(first)
    return variants


def map_stock_status(etat_stock):
    """Map JSON etat_stock to PriceOffer.stock_status."""
    if not etat_stock:
        return "in_stock"
    s = str(etat_stock).lower()
    if "hors stock" in s or "rupture" in s:
        return "out_of_stock"
    if "stock faible" in s or "faible" in s or "peu" in s:
        return "low_stock"
    if "en stock" in s:
        return "in_stock"
    return "in_stock"
