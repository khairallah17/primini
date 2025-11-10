#!/usr/bin/env python3
"""
Test script to preview merge logic without API calls
"""

import json
import re

def quick_similarity_check(product1, product2):
    """Quick pre-filter to check if products might be similar"""
    name1 = product1.get('name', '').lower()
    name2 = product2.get('name', '').lower()
    
    if not name1 or not name2:
        return False
    
    # Extract brand (first word) and key model identifiers
    words1 = name1.split()
    words2 = name2.split()
    
    if not words1 or not words2:
        return False
    
    # Check if same brand (first word)
    if words1[0] != words2[0]:
        return False
    
    # Check for common model number patterns (alphanumeric codes)
    model_pattern = r'[A-Z]{2,}\d+[A-Z]*|\d+[A-Z]{2,}'
    models1 = set(re.findall(model_pattern, name1.upper()))
    models2 = set(re.findall(model_pattern, name2.upper()))
    
    # If they share at least one model identifier, they might be similar
    if models1 and models2 and models1.intersection(models2):
        return True
    
    # If brand matches and names are similar length, might be similar
    if len(words1) >= 3 and len(words2) >= 3:
        # Check if first 3 words overlap significantly
        common_words = set(words1[:3]).intersection(set(words2[:3]))
        if len(common_words) >= 2:
            return True
    
    return False

def merge_dict(dict1, dict2):
    """Merge two dictionaries, handling arrays for duplicate keys"""
    merged = dict1.copy()
    
    for key, value in dict2.items():
        if key in merged:
            # If both have the same key, make it an array
            existing = merged[key]
            if isinstance(existing, list):
                if value not in existing:
                    merged[key].append(value)
            elif isinstance(value, list):
                if existing not in value:
                    merged[key] = [existing] + value
                else:
                    merged[key] = value
            elif existing != value:
                merged[key] = [existing, value]
        else:
            merged[key] = value
    
    return merged

def merge_product_data(product1, product2):
    """Merge two product objects"""
    # Use the longer/more complete name
    name1 = product1.get('name', '')
    name2 = product2.get('name', '')
    merged_name = name1 if len(name1) > len(name2) else name2
    
    # Merge prices (combine all merchants)
    merged_price = merge_dict(
        product1.get('price', {}),
        product2.get('price', {})
    )
    
    # Merge URLs (combine all merchants)
    merged_url = merge_dict(
        product1.get('url', {}),
        product2.get('url', {})
    )
    
    # Use the best image (prefer non-empty)
    image1 = product1.get('image_url', '')
    image2 = product2.get('image_url', '')
    merged_image = image1 if image1 else image2
    
    # Merge descriptions
    desc1 = product1.get('description', '').strip()
    desc2 = product2.get('description', '').strip()
    if desc1 and desc2 and desc1 != desc2:
        merged_description = f"{desc1}\n{desc2}"
    else:
        merged_description = desc1 or desc2
    
    # Use category from first product
    merged_category = product1.get('category', product2.get('category', 'Autre'))
    
    return {
        'name': merged_name,
        'price': merged_price,
        'image_url': merged_image,
        'url': merged_url,
        'description': merged_description,
        'category': merged_category
    }

def main():
    print("Loading sample files...")
    
    with open('products_sample.json', 'r', encoding='utf-8') as f:
        data1 = json.load(f)
        products1 = data1.get('products', [])
    
    with open('offers_sample.json', 'r', encoding='utf-8') as f:
        data2 = json.load(f)
        products2 = data2.get('products', [])
    
    print(f"File 1: {len(products1)} products")
    print(f"File 2: {len(products2)} products")
    print()
    
    print("Testing quick similarity filter...")
    print("=" * 80)
    
    matches_found = []
    for i, p1 in enumerate(products1):
        candidates = []
        for j, p2 in enumerate(products2):
            if quick_similarity_check(p1, p2):
                candidates.append((j, p2))
        
        if candidates:
            print(f"\n✓ Product {i+1} from file 1 has {len(candidates)} candidate(s):")
            print(f"  '{p1['name'][:70]}'")
            for j, p2 in candidates:
                print(f"    → Matches: '{p2['name'][:70]}'")
                # Show what the merge would look like
                merged = merge_product_data(p1, p2)
                print(f"      Merged name: '{merged['name'][:70]}'")
                print(f"      Merged prices: {list(merged['price'].keys())}")
                print(f"      Merged URLs: {list(merged['url'].keys())}")
            matches_found.append((i, p1, candidates))
    
    if not matches_found:
        print("\nNo quick matches found in this small sample.")
        print("This is expected - the AI would check all products for similarity.")
        print("\nSample products from file 1:")
        for i, p in enumerate(products1[:3], 1):
            print(f"  {i}. {p.get('name', '')[:70]}")
        print("\nSample products from file 2:")
        for i, p in enumerate(products2[:3], 1):
            print(f"  {i}. {p.get('name', '')[:70]}")
    
    print("\n" + "=" * 80)
    print("\nTo run with actual AI:")
    print("1. Install openai: pip install openai")
    print("2. Set your OpenAI API key:")
    print("   export OPENAI_API_KEY='your-key-here'")
    print("3. Run:")
    print("   python merge_products_ai.py --file1 products_sample.json --file2 offers_sample.json --output merged_sample.json")

if __name__ == "__main__":
    main()
