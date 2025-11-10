#!/usr/bin/env python3
"""
Script to merge similar products from two JSON files using AI/LLM.
Uses OpenAI API to intelligently identify products with similar names.
"""

import json
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import openai
from openai import OpenAI

# Configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')  # Use cheaper model by default
BATCH_SIZE = 50  # Process products in batches
SIMILARITY_THRESHOLD = 0.85  # Threshold for similarity (0-1)
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


class ProductMerger:
    """Class to handle merging similar products using AI"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = OPENAI_MODEL):
        """
        Initialize the ProductMerger.
        
        Args:
            api_key: OpenAI API key (if None, uses OPENAI_API_KEY env var)
            model: OpenAI model to use
        """
        self.api_key = api_key or OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OpenAI API key not found. Set OPENAI_API_KEY environment variable.")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = model
        self.stats = {
            'total_products': 0,
            'merged_products': 0,
            'api_calls': 0,
            'errors': 0
        }
    
    def merge_dict(self, dict1: Dict, dict2: Dict) -> Dict:
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
    
    def merge_product_data(self, product1: Dict, product2: Dict) -> Dict:
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
        merged_price = self.merge_dict(
            product1.get('price', {}),
            product2.get('price', {})
        )
        
        # Merge URLs (combine all merchants)
        merged_url = self.merge_dict(
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
    
    def quick_similarity_check(self, product1: Dict, product2: Dict) -> bool:
        """
        Quick pre-filter to check if products might be similar without using AI.
        This helps reduce API calls.
        
        Args:
            product1: First product
            product2: Second product
        
        Returns:
            True if products might be similar (worth checking with AI)
        """
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
    
    def are_products_similar(self, product1: Dict, product2: Dict) -> Tuple[bool, float]:
        """
        Use AI to determine if two products are similar.
        
        Args:
            product1: First product
            product2: Second product
        
        Returns:
            Tuple of (is_similar: bool, confidence: float)
        """
        name1 = product1.get('name', '')
        name2 = product2.get('name', '')
        
        if not name1 or not name2:
            return False, 0.0
        
        # Quick check: exact match
        if name1.lower().strip() == name2.lower().strip():
            return True, 1.0
        
        # Prepare prompt for LLM
        prompt = f"""You are a product matching expert. Determine if these two product names refer to the same product.

Product 1: "{name1}"
Product 2: "{name2}"

Consider:
- Brand names should match
- Model numbers should match
- Minor differences in formatting, capitalization, or description text are acceptable
- Different product variants (colors, sizes) should be considered DIFFERENT products
- Different models even from same brand are DIFFERENT products

Respond with ONLY a JSON object in this exact format:
{{
    "is_same_product": true or false,
    "confidence": 0.0 to 1.0,
    "reason": "brief explanation"
}}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a product matching expert. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for consistency
                max_tokens=150
            )
            
            self.stats['api_calls'] += 1
            
            content = response.choices[0].message.content.strip()
            
            # Parse JSON response
            # Sometimes response might have markdown code blocks
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
                content = content.strip()
            
            result = json.loads(content)
            
            is_similar = result.get('is_same_product', False)
            confidence = float(result.get('confidence', 0.0))
            
            return is_similar and confidence >= SIMILARITY_THRESHOLD, confidence
        
        except Exception as e:
            print(f"    Error checking similarity: {e}")
            self.stats['errors'] += 1
            # Fallback to simple string comparison
            return False, 0.0
    
    def find_similar_products_batch(self, products: List[Dict]) -> Dict[int, List[int]]:
        """
        Find similar products in a batch using AI.
        
        Args:
            products: List of products to check
        
        Returns:
            Dictionary mapping product index to list of similar product indices
        """
        similar_groups = {}
        checked_pairs = set()
        
        print(f"    Checking {len(products)} products for similarities...")
        
        for i in range(len(products)):
            if i % 10 == 0:
                print(f"      Progress: {i}/{len(products)}...")
            
            similar_indices = []
            
            for j in range(i + 1, len(products)):
                # Skip if already checked
                pair_key = tuple(sorted([i, j]))
                if pair_key in checked_pairs:
                    continue
                
                checked_pairs.add(pair_key)
                
                # Check similarity with retries
                is_similar = False
                for attempt in range(MAX_RETRIES):
                    try:
                        is_similar, confidence = self.are_products_similar(products[i], products[j])
                        if is_similar:
                            similar_indices.append(j)
                            print(f"      ✓ Match found: '{products[i]['name'][:50]}...' <-> '{products[j]['name'][:50]}...' (confidence: {confidence:.2f})")
                        break
                    except Exception as e:
                        if attempt < MAX_RETRIES - 1:
                            print(f"      Retry {attempt + 1}/{MAX_RETRIES}...")
                            time.sleep(RETRY_DELAY)
                        else:
                            print(f"      Error after {MAX_RETRIES} attempts: {e}")
            
            if similar_indices:
                similar_groups[i] = similar_indices
        
        return similar_groups
    
    def merge_products(self, products1: List[Dict], products2: List[Dict]) -> List[Dict]:
        """
        Merge products from two lists, identifying and merging similar products.
        
        Args:
            products1: First list of products
            products2: Second list of products
        
        Returns:
            Merged list of products
        """
        print(f"Starting merge process...")
        print(f"  Products from file 1: {len(products1)}")
        print(f"  Products from file 2: {len(products2)}")
        
        # Combine all products with source tracking
        all_products = []
        for i, p in enumerate(products1):
            all_products.append({**p, '_source': 'file1', '_index': i})
        for i, p in enumerate(products2):
            all_products.append({**p, '_source': 'file2', '_index': i})
        
        self.stats['total_products'] = len(all_products)
        
        print(f"\nTotal products to process: {len(all_products)}")
        print(f"Processing in batches of {BATCH_SIZE}...")
        print(f"Note: This will compare products within batches and across file boundaries.")
        
        # Use a simpler approach: compare each product from file1 with file2
        # This is more efficient and makes more sense for merging two files
        merged_products = []
        matched_file2_indices = set()
        
        print(f"\nComparing products from file 1 with file 2...")
        
        for i, product1 in enumerate(products1):
            if (i + 1) % 100 == 0:
                print(f"  Progress: {i + 1}/{len(products1)} products from file 1 checked...")
            
            best_match_idx = None
            best_confidence = 0.0
            best_match = None
            
            # Find best match in file 2
            # First, quick filter to reduce API calls
            candidates = []
            for j, product2 in enumerate(products2):
                if j in matched_file2_indices:
                    continue
                if self.quick_similarity_check(product1, product2):
                    candidates.append((j, product2))
            
            # If no quick candidates, add product1 as-is and continue
            if not candidates:
                merged_products.append(product1)
                continue
            
            # Use AI to check candidates
            for j, product2 in candidates:
                # Check similarity with retries
                is_similar = False
                confidence = 0.0
                
                for attempt in range(MAX_RETRIES):
                    try:
                        is_similar, confidence = self.are_products_similar(product1, product2)
                        if is_similar and confidence > best_confidence:
                            best_match_idx = j
                            best_confidence = confidence
                            best_match = product2
                        break
                    except Exception as e:
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(RETRY_DELAY)
                        else:
                            print(f"    Error comparing products: {e}")
            
            # If match found, merge
            if best_match:
                merged_product = self.merge_product_data(product1, best_match)
                merged_products.append(merged_product)
                matched_file2_indices.add(best_match_idx)
                self.stats['merged_products'] += 1
                print(f"  ✓ Merged: '{product1['name'][:50]}...' <-> '{best_match['name'][:50]}...' (confidence: {best_confidence:.2f})")
            else:
                # No match, add product1 as-is
                merged_products.append(product1)
            
            # Rate limiting
            if (i + 1) % 10 == 0:
                time.sleep(0.5)  # Small delay every 10 products
        
        # Add unmatched products from file 2
        print(f"\nAdding unmatched products from file 2...")
        for j, product2 in enumerate(products2):
            if j not in matched_file2_indices:
                merged_products.append(product2)
        
        print(f"\nMerge complete!")
        print(f"  Original products: {self.stats['total_products']}")
        print(f"  Merged products: {len(merged_products)}")
        print(f"  Products merged: {self.stats['merged_products']}")
        print(f"  API calls made: {self.stats['api_calls']}")
        print(f"  Errors: {self.stats['errors']}")
        
        return merged_products


def main():
    """Main function to run the merge process"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Merge similar products using AI')
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
        '--api-key',
        type=str,
        help='OpenAI API key (or set OPENAI_API_KEY env var)'
    )
    parser.add_argument(
        '--model',
        type=str,
        default=OPENAI_MODEL,
        help=f'OpenAI model to use (default: {OPENAI_MODEL})'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=BATCH_SIZE,
        help=f'Batch size for processing (default: {BATCH_SIZE})'
    )
    
    args = parser.parse_args()
    
    # Use batch size from args or default
    batch_size = args.batch_size
    
    # Check if API key is available
    api_key = args.api_key or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("ERROR: OpenAI API key not found!")
        print("Please set OPENAI_API_KEY environment variable or use --api-key argument")
        return 1
    
    # Load JSON files
    print(f"Loading {args.file1}...")
    with open(args.file1, 'r', encoding='utf-8') as f:
        data1 = json.load(f)
    products1 = data1.get('products', [])
    
    print(f"Loading {args.file2}...")
    with open(args.file2, 'r', encoding='utf-8') as f:
        data2 = json.load(f)
    products2 = data2.get('products', [])
    
    # Initialize merger
    merger = ProductMerger(api_key=api_key, model=args.model)
    
    # Merge products (batch_size is currently not used in the new algorithm, but kept for future use)
    merged_products = merger.merge_products(products1, products2)
    
    # Save merged results
    output_data = {
        'products': merged_products,
        'metadata': {
            'source_files': [args.file1, args.file2],
            'total_original': len(products1) + len(products2),
            'total_merged': len(merged_products),
            'products_merged_count': merger.stats['merged_products'],
            'api_calls': merger.stats['api_calls']
        }
    }
    
    print(f"\nSaving merged products to {args.output}...")
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print("Done!")
    return 0


if __name__ == "__main__":
    exit(main())

