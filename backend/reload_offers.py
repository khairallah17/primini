#!/usr/bin/env python
"""Remove all PriceOffer entries and re-import from data/ JSON files.
Run: cd backend && python reload_offers.py

Delegates to reload_offers_standalone.py for reliability.
"""
import subprocess
import sys
from pathlib import Path

if __name__ == "__main__":
    script = Path(__file__).resolve().parent / "reload_offers_standalone.py"
    sys.exit(subprocess.run([sys.executable, str(script)], check=False).returncode)
