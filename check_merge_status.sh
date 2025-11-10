#!/bin/bash
# Check status of merge process

echo "Checking merge process status..."
echo ""

if [ -f "merge_log_no_ai.txt" ]; then
    echo "Recent log output:"
    tail -30 merge_log_no_ai.txt
    echo ""
fi

if [ -f "products_merged.json" ]; then
    echo "✅ Output file exists!"
    echo ""
    python3 << 'EOF'
import json
import os

if os.path.exists('products_merged.json'):
    try:
        with open('products_merged.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            products = data.get('products', [])
            metadata = data.get('metadata', {})
            
            print(f"Results:")
            print(f"  Total products: {len(products):,}")
            print(f"  Original products: {metadata.get('total_original', 0):,}")
            print(f"  Similarity threshold: {metadata.get('similarity_threshold', 0.75)}")
            print(f"  File size: {os.path.getsize('products_merged.json') / 1024 / 1024:.2f} MB")
    except Exception as e:
        print(f"File exists but couldn't read: {e}")
        print("Process may still be running...")
else
    print("⏳ Output file not created yet. Process may still be running...")
EOF
else
    echo "⏳ Merge process is still running..."
    echo "   Check progress with: tail -f merge_log_no_ai.txt"
fi

