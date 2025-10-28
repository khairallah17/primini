#!/bin/bash

# Script to import products from products_restructured.json
# Usage: ./import-products.sh [path-to-json-file] [--clear]

# Default path to the JSON file
JSON_FILE="${1:-../products_restructured.json}"

# Check if we're in the backend directory
if [ ! -f "manage.py" ]; then
    echo "Error: This script must be run from the backend directory"
    echo "Usage: cd backend && ./import-products.sh [path-to-json-file] [--clear]"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found. Please create it first:"
    echo "python -m venv venv"
    echo "source venv/bin/activate"
    echo "pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if JSON file exists
if [ ! -f "$JSON_FILE" ]; then
    echo "Error: JSON file not found: $JSON_FILE"
    echo "Please provide the correct path to products_restructured.json"
    exit 1
fi

echo "Importing products from: $JSON_FILE"
echo "This may take a few minutes..."

# Run the import command
python manage.py import_restructured_products "$JSON_FILE" "${@:2}"

echo "Import completed!"
