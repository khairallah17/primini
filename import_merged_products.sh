#!/bin/bash

# Script to import products from products_merged.json
# Usage: ./import_merged_products.sh [--clear]

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON_FILE="${SCRIPT_DIR}/products_merged.json"
BACKEND_DIR="${SCRIPT_DIR}/backend"

# Check if JSON file exists
if [ ! -f "$JSON_FILE" ]; then
    echo "Error: JSON file not found: $JSON_FILE"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "${BACKEND_DIR}/venv" ]; then
    echo "Error: Virtual environment not found. Please create it first:"
    echo "cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

echo "=========================================="
echo "Importing products from: products_merged.json"
echo "=========================================="
if [[ "$*" == *"--clear"* ]]; then
    echo "⚠️  WARNING: This will clear all existing products, categories, merchants, and offers!"
    echo ""
fi
echo "This may take several minutes..."
echo ""

# Activate virtual environment and run the import command
cd "$BACKEND_DIR"
source venv/bin/activate
python manage.py import_restructured_products "$JSON_FILE" "$@"

echo ""
echo "=========================================="
echo "Import completed!"
echo "=========================================="

