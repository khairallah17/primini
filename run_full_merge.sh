#!/bin/bash
# Script to run the full merge on all products

set -e

echo "=========================================="
echo "Product Merge AI - Full Dataset Merge"
echo "=========================================="
echo ""

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ ERROR: OPENAI_API_KEY not set!"
    echo ""
    echo "Please set your OpenAI API key:"
    echo "  export OPENAI_API_KEY='your-api-key-here'"
    echo ""
    echo "You can get an API key from: https://platform.openai.com/api-keys"
    echo ""
    echo "⚠️  IMPORTANT: This will process ~32,000 products and make many API calls."
    echo "   Estimated cost: $5-20 (with gpt-4o-mini)"
    echo "   Estimated time: 2-6 hours"
    exit 1
fi

# Check if openai module is installed
echo "Checking dependencies..."
if ! python3 -c "import openai" 2>/dev/null; then
    echo "Installing openai module..."
    pip3 install openai
fi
echo "✓ Dependencies ready"
echo ""

# Show file sizes
python3 << 'EOF'
import json

with open('products_restructured.json', 'r', encoding='utf-8') as f:
    data1 = json.load(f)
    products1 = data1.get('products', [])

with open('offers_restructured.json', 'r', encoding='utf-8') as f:
    data2 = json.load(f)
    products2 = data2.get('products', [])

print(f"File sizes:")
print(f"  products_restructured.json: {len(products1):,} products")
print(f"  offers_restructured.json: {len(products2):,} products")
print(f"  Total products: {len(products1) + len(products2):,}")
print()
print("⚠️  This is a large operation!")
print("   - Will compare each product from file 1 with file 2")
print("   - Pre-filtering will reduce API calls significantly")
print("   - Estimated API calls: ~200K-1M (depends on matches)")
print("   - Estimated cost: $5-20 (gpt-4o-mini) or $100-500 (gpt-4)")
print("   - Estimated time: 2-6 hours")
print()
EOF

# Confirm before proceeding
read -p "Do you want to proceed? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Starting merge process..."
echo "Progress will be logged to: merge_log.txt"
echo ""

# Run the merge and save output
python3 merge_products_ai.py \
    --file1 products_restructured.json \
    --file2 offers_restructured.json \
    --output products_merged.json \
    --model gpt-4o-mini \
    2>&1 | tee merge_log.txt

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Merge completed successfully!"
    echo "=========================================="
    echo ""
    echo "Results saved to: products_merged.json"
    echo "Log file: merge_log.txt"
    echo ""
    
    # Show summary
    python3 << 'EOF'
import json
try:
    with open('products_merged.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        products = data.get('products', [])
        metadata = data.get('metadata', {})
        
        print(f"Summary:")
        print(f"  Original products: {metadata.get('total_original', len(products)):,}")
        print(f"  Merged products: {len(products):,}")
        print(f"  Products merged: {metadata.get('products_merged_count', 0):,}")
        print(f"  API calls made: {metadata.get('api_calls', 0):,}")
except Exception as e:
    print(f"Could not read results: {e}")
EOF
else
    echo ""
    echo "❌ Merge failed. Check merge_log.txt for details."
    exit $exit_code
fi

