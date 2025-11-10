#!/bin/bash
# Script to run the merge test with sample files

echo "=========================================="
echo "Product Merge AI - Sample Test"
echo "=========================================="
echo ""

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  ERROR: OPENAI_API_KEY not set!"
    echo ""
    echo "Please set your OpenAI API key:"
    echo "  export OPENAI_API_KEY='your-api-key-here'"
    echo ""
    echo "You can get an API key from: https://platform.openai.com/api-keys"
    exit 1
fi

# Check if openai module is installed
echo "Checking dependencies..."
if ! python3 -c "import openai" 2>/dev/null; then
    echo "⚠️  openai module not found. Installing..."
    pip3 install openai
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install openai module"
        exit 1
    fi
    echo "✓ openai module installed"
else
    echo "✓ openai module found"
fi

echo ""
echo "Running merge on sample files..."
echo "  File 1: products_sample.json (10 products)"
echo "  File 2: offers_sample.json (10 products)"
echo "  Output: merged_sample.json"
echo ""

python3 merge_products_ai.py \
    --file1 products_sample.json \
    --file2 offers_sample.json \
    --output merged_sample.json \
    --model gpt-4o-mini

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Merge completed successfully!"
    echo "=========================================="
    echo ""
    echo "Results saved to: merged_sample.json"
    echo ""
    echo "To view results:"
    echo "  cat merged_sample.json | python3 -m json.tool | head -50"
else
    echo ""
    echo "❌ Merge failed. Check the error messages above."
    exit 1
fi

