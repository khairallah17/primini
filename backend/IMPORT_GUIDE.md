# Product Import Guide

This guide explains how to import products from the `products_restructured.json` file into the Avita database.

## Prerequisites

1. Make sure you have the Django backend set up with the virtual environment activated
2. Ensure the database is properly configured and migrations are applied

## Import Methods

### Method 1: Using the Shell Script (Recommended)

The easiest way to import products is using the provided shell script:

```bash
cd backend
./import-products.sh [path-to-json-file] [--clear]
```

Examples:
```bash
# Import from default location (../products_restructured.json)
./import-products.sh

# Import from a specific file
./import-products.sh /path/to/products_restructured.json

# Clear existing data and import fresh
./import-products.sh --clear
```

### Method 2: Using Django Management Command Directly

You can also run the Django management command directly:

```bash
cd backend
source venv/bin/activate
python manage.py import_restructured_products [path-to-json-file] [--clear]
```

## Command Options

- `--clear`: Optional flag to clear all existing products, categories, merchants, and offers before importing new data
- Without `--clear`: New products will be added to existing data (duplicates will be skipped)

## Import Process

The import process will:

1. **Parse the JSON file** and extract product information
2. **Create categories** based on the "category" field in each product
3. **Extract merchants** from the price and URL dictionaries
4. **Create products** with proper slugs and brand extraction
5. **Create price offers** linking products to merchants with prices and URLs
6. **Handle price parsing** including currency symbols and different decimal formats

## Data Structure Expected

The JSON file should have this structure:

```json
{
  "products": [
    {
      "name": "Product Name",
      "price": {
        "Merchant1": "1,234.56 DH",
        "Merchant2": "1,200.00 DH"
      },
      "url": {
        "Merchant1": "https://merchant1.com/product",
        "Merchant2": "https://merchant2.com/product"
      },
      "image_url": "https://example.com/image.jpg",
      "description": "Product description",
      "category": "Category Name"
    }
  ]
}
```

## Import Results

After a successful import, you should see output like:

```
Import completed successfully!
Categories: 7
Products: 7320
Merchants: 3
Offers: 6652
```

## Troubleshooting

### Common Issues

1. **File not found**: Make sure the path to the JSON file is correct
2. **Permission errors**: Ensure the script has execute permissions (`chmod +x import-products.sh`)
3. **Virtual environment not activated**: Make sure to activate the virtual environment before running
4. **Database errors**: Ensure migrations are applied and the database is accessible

### Checking Import Results

You can verify the import was successful by checking the database:

```bash
cd backend
source venv/bin/activate
python manage.py shell -c "
from primini_backend.products.models import Product, Category, Merchant, PriceOffer
print(f'Categories: {Category.objects.count()}')
print(f'Products: {Product.objects.count()}')
print(f'Merchants: {Merchant.objects.count()}')
print(f'Offers: {PriceOffer.objects.count()}')
"
```

## Performance Notes

- Large JSON files (like the 19,767 products in `products_restructured.json`) may take several minutes to import
- The import process shows progress every 100 products
- All operations are wrapped in a database transaction for data integrity
- Duplicate products (same slug) will be skipped, not overwritten

## Re-importing Data

If you need to update the data:

1. **Clear and re-import**: Use `--clear` flag to remove all existing data first
2. **Incremental import**: Without `--clear`, only new products will be added
3. **Update existing**: The command uses `get_or_create` and `update_or_create` to handle existing data appropriately
