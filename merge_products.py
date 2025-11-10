#!/usr/bin/env python3
"""
Script to merge similar products from two JSON files without AI.
Uses fuzzy string matching and similarity algorithms.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple
from difflib import SequenceMatcher


def similarity_ratio(str1: str, str2: str) -> float:
    """
    Calculate similarity ratio between two strings.
    
    Args:
        str1: First string
        str2: Second string
    
    Returns:
        Similarity ratio between 0.0 and 1.0
    """
    return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()


def extract_brand_model(name: str) -> Tuple[str, List[str]]:
    """
    Extract brand and model identifiers from product name.
    
    Args:
        name: Product name
    
    Returns:
        Tuple of (brand, list of model identifiers)
    """
    name_upper = name.upper()
    
    # Extract brand (first word, usually)
    words = name.split()
    brand = words[0] if words else ""
    
    # Extract model numbers/identifiers
    # Patterns: "L3250", "EB-Z9800W", "CO-W01", "V11HA86040", etc.
    model_patterns = [
        r'[A-Z]{1,2}[-]?[A-Z]?\d+[A-Z]*',  # L3250, EB-Z9800W, CO-W01
        r'[A-Z]\d+[A-Z]+',  # V11HA86040
        r'\d+[A-Z]{2,}',  # 3250DH
        r'[A-Z]{2,}\d+',  # HP240
    ]
    
    models = []
    for pattern in model_patterns:
        matches = re.findall(pattern, name_upper)
        models.extend(matches)
    
    # Remove duplicates and short ones
    models = list(set([m for m in models if len(m) >= 3]))
    
    return brand, models


def extract_keywords(name: str) -> set:
    """
    Extract key words from product name (excluding common words).
    
    Args:
        name: Product name
    
    Returns:
        Set of key words
    """
    # Common words to ignore
    stop_words = {
        'a', 'à', 'le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou',
        'pour', 'avec', 'sans', 'sur', 'dans', 'par',
        'the', 'and', 'or', 'for', 'with', 'without', 'on', 'in', 'by',
        'multifonction', 'imprimante', 'vidéo', 'projecteur', 'vidéoprojecteur'
    }
    
    # Extract words
    words = re.findall(r'\b\w+\b', name.lower())
    keywords = {w for w in words if len(w) > 2 and w not in stop_words}
    
    return keywords


def are_products_similar(product1: Dict, product2: Dict, threshold: float = 0.75) -> Tuple[bool, float]:
    """
    Determine if two products are similar using multiple heuristics.
    
    Args:
        product1: First product
        product2: Second product
        threshold: Similarity threshold (0.0 to 1.0)
    
    Returns:
        Tuple of (is_similar: bool, confidence: float)
    """
    name1 = product1.get('name', '').strip()
    name2 = product2.get('name', '').strip()
    
    if not name1 or not name2:
        return False, 0.0
    
    # Exact match
    if name1.lower() == name2.lower():
        return True, 1.0
    
    # Extract brand and models
    brand1, models1 = extract_brand_model(name1)
    brand2, models2 = extract_brand_model(name2)
    
    # Must have same brand
    if brand1 != brand2:
        return False, 0.0
    
    # Check model overlap
    model_overlap = False
    if models1 and models2:
        model_overlap = bool(set(models1).intersection(set(models2)))
    
    # If models match, high confidence
    if model_overlap:
        # Calculate name similarity
        name_sim = similarity_ratio(name1, name2)
        # Boost confidence if models match
        confidence = min(0.95, name_sim * 1.2)
        return confidence >= threshold, confidence
    
    # Extract keywords
    keywords1 = extract_keywords(name1)
    keywords2 = extract_keywords(name2)
    
    if not keywords1 or not keywords2:
        # Fallback to simple string similarity
        similarity = similarity_ratio(name1, name2)
        return similarity >= threshold, similarity
    
    # Calculate keyword overlap
    common_keywords = keywords1.intersection(keywords2)
    total_keywords = keywords1.union(keywords2)
    
    if not total_keywords:
        return False, 0.0
    
    keyword_ratio = len(common_keywords) / len(total_keywords)
    
    # Calculate name similarity
    name_similarity = similarity_ratio(name1, name2)
    
    # Combine scores
    # Weight: 40% keyword overlap, 60% string similarity
    combined_score = (keyword_ratio * 0.4) + (name_similarity * 0.6)
    
    # Boost if brand matches and enough keywords match
    if len(common_keywords) >= 3:
        combined_score = min(0.95, combined_score * 1.1)
    
    return combined_score >= threshold, combined_score


def merge_dict(dict1: Dict, dict2: Dict) -> Dict:
    """
    Merge two dictionaries, handling arrays for duplicate keys.
    
    Args:
        dict1: First dictionary
        dict2: Second dictionary
    
    Returns:
        Merged dictionary
    """
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


def merge_product_data(product1: Dict, product2: Dict) -> Dict:
    """
    Merge two product objects intelligently.
    
    Args:
        product1: First product
        product2: Second product
    
    Returns:
        Merged product
    """
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
    
    # Merge descriptions (combine if both exist)
    desc1 = product1.get('description', '').strip()
    desc2 = product2.get('description', '').strip()
    if desc1 and desc2 and desc1 != desc2:
        merged_description = f"{desc1}\n{desc2}"
    else:
        merged_description = desc1 or desc2
    
    # Use category from first product (should be same if similar)
    merged_category = product1.get('category', product2.get('category', 'Autre'))
    
    return {
        'name': merged_name,
        'price': merged_price,
        'image_url': merged_image,
        'url': merged_url,
        'description': merged_description,
        'category': merged_category
    }


def merge_products(products1: List[Dict], products2: List[Dict], threshold: float = 0.75) -> List[Dict]:
    """
    Merge products from two lists, identifying and merging similar products.
    
    Args:
        products1: First list of products
        products2: Second list of products
        threshold: Similarity threshold (default: 0.75)
    
    Returns:
        Merged list of products
    """
    print(f"Starting merge process...")
    print(f"  Products from file 1: {len(products1):,}")
    print(f"  Products from file 2: {len(products2):,}")
    print(f"  Similarity threshold: {threshold}")
    print()
    
    merged_products = []
    matched_file2_indices = set()
    stats = {
        'matched': 0,
        'unmatched_file1': 0,
        'unmatched_file2': 0
    }
    
    print(f"Comparing products from file 1 with file 2...")
    
    for i, product1 in enumerate(products1):
        if (i + 1) % 1000 == 0:
            print(f"  Progress: {i + 1:,}/{len(products1):,} products from file 1 checked...")
        
        best_match_idx = None
        best_confidence = 0.0
        best_match = None
        
        # Find best match in file 2
        for j, product2 in enumerate(products2):
            if j in matched_file2_indices:
                continue
            
            is_similar, confidence = are_products_similar(product1, product2, threshold)
            
            if is_similar and confidence > best_confidence:
                best_match_idx = j
                best_confidence = confidence
                best_match = product2
        
        # If match found, merge
        if best_match:
            merged_product = merge_product_data(product1, best_match)
            merged_products.append(merged_product)
            matched_file2_indices.add(best_match_idx)
            stats['matched'] += 1
            
            if stats['matched'] % 100 == 0:
                print(f"  ✓ Merged {stats['matched']:,} products so far...")
        else:
            # No match, add product1 as-is
            merged_products.append(product1)
            stats['unmatched_file1'] += 1
    
    # Add unmatched products from file 2
    print(f"\nAdding unmatched products from file 2...")
    for j, product2 in enumerate(products2):
        if j not in matched_file2_indices:
            merged_products.append(product2)
            stats['unmatched_file2'] += 1
    
    print(f"\nMerge complete!")
    print(f"  Original products: {len(products1) + len(products2):,}")
    print(f"  Merged products: {len(merged_products):,}")
    print(f"  Products matched: {stats['matched']:,}")
    print(f"  Unmatched from file 1: {stats['unmatched_file1']:,}")
    print(f"  Unmatched from file 2: {stats['unmatched_file2']:,}")
    
    return merged_products


def main():
    """Main function to run the merge process"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Merge similar products without AI')
    parser.add_argument(
        '--file1',
        type=str,
        default='products_restructured.json',
        help='Path to first JSON file'
    )
    parser.add_argument(
        '--file2',
        type=str,
        default='offers_restructured.json',
        help='Path to second JSON file'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='products_merged.json',
        help='Output file path'
    )
    parser.add_argument(
        '--threshold',
        type=float,
        default=0.75,
        help='Similarity threshold (0.0 to 1.0, default: 0.75)'
    )
    
    args = parser.parse_args()
    
    # Load JSON files
    print(f"Loading {args.file1}...")
    with open(args.file1, 'r', encoding='utf-8') as f:
        data1 = json.load(f)
    products1 = data1.get('products', [])
    
    print(f"Loading {args.file2}...")
    with open(args.file2, 'r', encoding='utf-8') as f:
        data2 = json.load(f)
    products2 = data2.get('products', [])
    
    # Merge products
    merged_products = merge_products(products1, products2, threshold=args.threshold)
    
    # Save merged results
    output_data = {
        'products': merged_products,
        'metadata': {
            'source_files': [args.file1, args.file2],
            'total_original': len(products1) + len(products2),
            'total_merged': len(merged_products),
            'similarity_threshold': args.threshold
        }
    }
    
    print(f"\nSaving merged products to {args.output}...")
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print("Done!")
    return 0


if __name__ == "__main__":
    exit(main())

