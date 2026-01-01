"""
Management command to classify products into categories and subcategories using ChatGPT.

This command:
1. Iterates through all products in the database
2. Sends product name to ChatGPT/OpenAI
3. Gets category and subcategory classification
4. Updates the product with the classified category and subcategory
5. Generates detailed logs of the process
"""

import json
import os
import time
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from django.conf import settings

from primini_backend.products.models import Category, Product

# Try to import OpenAI
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Category structure matching the frontend
CATEGORIES_DATA = {
    'categories': [
        {
            'name': 'Informatique',
            'subcategories': [
                'Composants',
                'Ordinateurs',
                'Réseaux et connectivité',
                'Périphériques',
                'Stockages',
                'Tablettes'
            ]
        },
        {
            'name': 'Téléphonie',
            'subcategories': [
                'Smartphones',
                'Accessoires Téléphones',
                'Téléphones Fixes',
                'Smart Watches'
            ]
        },
        {
            'name': 'Santé - Beauté',
            'subcategories': [
                'Visage',
                'Cheveux',
                'Corps',
                'Parfums',
                'Dents',
                'Maquillage',
                'Parfum d\'ambiance',
                'Santé',
                'Hommes'
            ]
        },
        {
            'name': 'Electroménager',
            'subcategories': [
                'Aspirateurs',
                'Machine à Laver',
                'Sèche Linges',
                'Lave vaisselles',
                'Fours',
                'Micro Ondes',
                'Plaques de cuisson',
                'Cuisinières',
                'Hottes aspirantes',
                'Climatiseurs',
                'Chauffages',
                'Chauffe Bain',
                'Réfrigérateurs et congélateurs'
            ]
        },
        {
            'name': 'Petit Electroménager',
            'subcategories': [
                'Machines à café',
                'Fer à Repasser',
                'Blenders',
                'Appareils de cuisson',
                'Robot Pétrin et Robot de Cuisine Multifonction',
                'Machine à Pain',
                'Mixeurs',
                'Batteurs',
                'Moulins à café',
                'Grille Pains',
                'Gaufriers',
                'Balances de cuisine',
                'Bouilloires',
                'Friteuses',
                'Yaourtière',
                'Défroisseurs à vapeur',
                'Sorbetières',
                'Centrifugeuses'
            ]
        },
        {
            'name': 'Image & Son',
            'subcategories': [
                'Écouteurs',
                'Haut-parleurs',
                'Systèmes home cinéma',
                'Microphones',
                'Téléviseurs',
                'Projecteurs',
                'Digital TV Boxes',
                'TV Accessories',
                'Casques'
            ]
        },
        {
            'name': 'Photo & Caméra',
            'subcategories': [
                'Appareils photos numériques',
                'Objectifs pour appareil photo'
            ]
        }
    ]
}


class Command(BaseCommand):
    help = 'Classify products into categories and subcategories using ChatGPT'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Limit the number of products to process (0 = all)'
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip products that already have both category and subcategory'
        )
        parser.add_argument(
            '--model',
            type=str,
            default='gpt-4o-mini',
            help='OpenAI model to use (default: gpt-4o-mini)'
        )
        parser.add_argument(
            '--api-key',
            type=str,
            help='OpenAI API key (or set OPENAI_API_KEY env var)'
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=1.0,
            help='Delay between API calls in seconds (default: 1.0)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1,
            help='Number of products to process in each batch (default: 1)'
        )
        parser.add_argument(
            '--resume',
            action='store_true',
            help='Resume from the last processed product (uses resume file)'
        )
        parser.add_argument(
            '--resume-file',
            type=str,
            default=None,
            help='Path to resume file (default: auto-generated)'
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.stats = {
            'processed': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0,
            'api_calls': 0,
        }
        self.log_file = None
        self.resume_file = None
        self.last_processed_id = None
        self.client = None

    def setup_logging(self, resume_file_path=None):
        """Create log file with timestamp"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        # Use Django's BASE_DIR to get the backend directory
        # BASE_DIR is the directory containing manage.py (backend/)
        backend_dir = Path(settings.BASE_DIR)
        log_file_path = backend_dir / f'classify_products_{timestamp}.log'
        
        # Setup resume file
        if resume_file_path:
            self.resume_file = Path(resume_file_path)
        else:
            self.resume_file = backend_dir / f'classify_products_resume.json'
        
        # Ensure the directory exists
        log_file_path.parent.mkdir(parents=True, exist_ok=True)
        self.resume_file.parent.mkdir(parents=True, exist_ok=True)
        
        self.log_file = open(log_file_path, 'w', encoding='utf-8')
        self.stdout.write(self.style.SUCCESS(f'Log file: {log_file_path}'))
        self.stdout.write(self.style.SUCCESS(f'Resume file: {self.resume_file}'))
        
        self.log(f'=== Classification Session Started ===')
        self.log(f'Timestamp: {datetime.now().isoformat()}')
        self.log(f'Log file: {log_file_path}')
        self.log(f'Resume file: {self.resume_file}')

    def log(self, message, level='INFO'):
        """Write to both console and log file"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_message = f'[{timestamp}] {message}'
        
        if self.log_file:
            self.log_file.write(log_message + '\n')
            self.log_file.flush()
        
        if level == 'ERROR':
            self.stdout.write(self.style.ERROR(log_message))
        elif level == 'WARNING':
            self.stdout.write(self.style.WARNING(log_message))
        elif level == 'SUCCESS':
            self.stdout.write(self.style.SUCCESS(log_message))
        else:
            self.stdout.write(log_message)

    def setup_openai_client(self, api_key=None):
        """Initialize OpenAI client"""
        if not OPENAI_AVAILABLE:
            raise ImportError('OpenAI library not installed. Install it with: pip install openai')
        
        api_key = api_key or os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise ValueError('OpenAI API key not found! Set OPENAI_API_KEY env var or use --api-key')
        
        # Validate API key format (should start with sk-)
        if not api_key.startswith('sk-'):
            self.log(f'WARNING: API key format looks incorrect (should start with sk-)', 'WARNING')
        
        self.client = OpenAI(api_key=api_key)
        
        # Test the API key with a simple request
        try:
            self.log('Testing API key...')
            test_response = self.client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[{'role': 'user', 'content': 'test'}],
                max_tokens=5
            )
            self.log('API key validated successfully', 'SUCCESS')
        except Exception as e:
            error_msg = str(e)
            if hasattr(e, 'response') and hasattr(e.response, 'json'):
                error_data = e.response.json()
                error_msg = f"Error code: {e.status_code} - {error_data}"
            elif hasattr(e, 'status_code'):
                error_msg = f"Error code: {e.status_code} - {error_msg}"
            
            self.log(f'API key validation failed: {error_msg}', 'ERROR')
            raise ValueError(f'Invalid API key or API error: {error_msg}')
        
        self.log(f'OpenAI client initialized with model: {self.options["model"]}')

    def build_categories_prompt(self):
        """Build the categories structure for the prompt"""
        # Include the actual JSON structure so ChatGPT can see the exact format
        categories_json = json.dumps(CATEGORIES_DATA, indent=2, ensure_ascii=False)
        
        categories_text = "Available categories and subcategories:\n\n"
        for cat in CATEGORIES_DATA['categories']:
            categories_text += f"- {cat['name']}:\n"
            for subcat in cat['subcategories']:
                categories_text += f"  - {subcat}\n"
            categories_text += "\n"
        
        return categories_json, categories_text

    def classify_product(self, product_name, model='gpt-4o-mini'):
        """Send product name to ChatGPT and get category/subcategory classification"""
        if not self.client:
            raise ValueError('OpenAI client not initialized')
        
        categories_json, categories_text = self.build_categories_prompt()
        
        prompt = f"""You are a product classification assistant. Your task is to classify products into categories and subcategories.

Here is the EXACT JSON structure of available categories and subcategories:
{categories_json}

Here is a readable list for reference:
{categories_text}

Product name: "{product_name}"

Please classify this product by responding with ONLY a JSON object in this exact format:
{{
    "category": "Category Name",
    "subcategory": "Subcategory Name"
}}

CRITICAL RULES:
1. You MUST choose from the categories and subcategories in the JSON structure above
2. Category name must match EXACTLY (case-sensitive) one of the "name" values in the JSON structure
3. Subcategory name must match EXACTLY (case-sensitive) one of the subcategory strings under the chosen category in the JSON structure
4. Use the JSON structure as the source of truth - do not invent or modify category/subcategory names
5. If the product doesn't fit perfectly, choose the closest match from the available options
6. Return ONLY the JSON object, no additional text, markdown, or explanation

JSON response:"""

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        'role': 'system',
                        'content': 'You are a product classification assistant. Always respond with valid JSON only.'
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                temperature=0.3,
                max_tokens=150
            )
            
            self.stats['api_calls'] += 1
            result_text = response.choices[0].message.content.strip()
            
            # Try to extract JSON from response
            # Remove markdown code blocks if present
            if result_text.startswith('```'):
                result_text = result_text.split('```')[1]
                if result_text.startswith('json'):
                    result_text = result_text[4:]
                result_text = result_text.strip()
            
            # Parse JSON
            result = json.loads(result_text)
            
            return {
                'category': result.get('category', '').strip(),
                'subcategory': result.get('subcategory', '').strip()
            }
            
        except json.JSONDecodeError as e:
            self.log(f'JSON decode error: {e}. Response: {result_text}', 'ERROR')
            raise ValueError(f'Invalid JSON response from LLM: {result_text}')
        except Exception as e:
            # Better error handling for OpenAI API errors
            error_msg = str(e)
            error_details = {}
            
            if hasattr(e, 'response') and hasattr(e.response, 'json'):
                try:
                    error_data = e.response.json()
                    error_details = error_data
                    if 'error' in error_data:
                        error_msg = f"Error code: {e.status_code} - {error_data.get('error', {})}"
                except:
                    error_msg = f"Error code: {e.status_code} - {error_msg}"
            elif hasattr(e, 'status_code'):
                error_msg = f"Error code: {e.status_code} - {error_msg}"
            
            self.log(f'OpenAI API error: {error_msg}', 'ERROR')
            if error_details:
                self.log(f'Error details: {json.dumps(error_details, indent=2)}', 'ERROR')
            raise

    def find_category(self, category_name):
        """Find category by name (case-insensitive, handles variations)"""
        if not category_name:
            return None
        
        # Try exact match first
        try:
            return Category.objects.get(name=category_name, parent__isnull=True)
        except Category.DoesNotExist:
            pass
        except Category.MultipleObjectsReturned:
            return Category.objects.filter(name=category_name, parent__isnull=True).first()
        
        # Try case-insensitive match
        try:
            return Category.objects.filter(name__iexact=category_name, parent__isnull=True).first()
        except:
            pass
        
        # Try to find in our categories data and create if needed
        for cat_data in CATEGORIES_DATA['categories']:
            if cat_data['name'].lower() == category_name.lower():
                # Create the category if it doesn't exist
                category, created = Category.objects.get_or_create(
                    slug=slugify(cat_data['name']),
                    defaults={
                        'name': cat_data['name'],
                        'parent': None
                    }
                )
                if created:
                    self.log(f'  Created missing category: {cat_data["name"]}', 'WARNING')
                return category
        
        return None

    def find_subcategory(self, subcategory_name, parent_category):
        """Find subcategory by name and parent (case-insensitive)"""
        if not subcategory_name or not parent_category:
            return None
        
        # Try exact match first
        try:
            return Category.objects.get(name=subcategory_name, parent=parent_category)
        except Category.DoesNotExist:
            pass
        except Category.MultipleObjectsReturned:
            return Category.objects.filter(name=subcategory_name, parent=parent_category).first()
        
        # Try case-insensitive match
        try:
            return Category.objects.filter(name__iexact=subcategory_name, parent=parent_category).first()
        except:
            pass
        
        # Try to find in our categories data and create if needed
        for cat_data in CATEGORIES_DATA['categories']:
            if cat_data['name'] == parent_category.name:
                for subcat_name in cat_data['subcategories']:
                    if subcat_name.lower() == subcategory_name.lower():
                        # Check if subcategory already exists with correct parent
                        existing = Category.objects.filter(
                            name=subcat_name,
                            parent=parent_category
                        ).first()
                        
                        if existing:
                            return existing
                        
                        # Create the subcategory if it doesn't exist
                        # Use both slug and parent to ensure uniqueness
                        subcategory, created = Category.objects.get_or_create(
                            slug=slugify(subcat_name),
                            parent=parent_category,
                            defaults={
                                'name': subcat_name,
                            }
                        )
                        if created:
                            self.log(f'  Created missing subcategory: {subcat_name} under {parent_category.name}', 'WARNING')
                        else:
                            # Update name if it was different
                            if subcategory.name != subcat_name:
                                subcategory.name = subcat_name
                                subcategory.save()
                                self.log(f'  Updated subcategory name: {subcat_name} under {parent_category.name}', 'WARNING')
                        return subcategory
        
        return None

    def save_resume_state(self, product_id):
        """Save the last processed product ID to resume file"""
        if not self.resume_file:
            return
        
        resume_data = {
            'last_processed_id': product_id,
            'timestamp': datetime.now().isoformat(),
            'stats': self.stats.copy()
        }
        
        try:
            with open(self.resume_file, 'w', encoding='utf-8') as f:
                json.dump(resume_data, f, indent=2)
            # Only log every 10th save to avoid log spam
            if self.stats['processed'] % 10 == 0:
                self.log(f'Resume state saved: Last processed ID = {product_id}')
        except Exception as e:
            # Don't log every time to avoid spam, only log errors
            if self.stats['processed'] % 10 == 0:
                self.log(f'  WARNING: Failed to save resume state: {e}', 'WARNING')

    def load_resume_state(self):
        """Load the last processed product ID from resume file"""
        if not self.resume_file or not self.resume_file.exists():
            return None
        
        try:
            with open(self.resume_file, 'r', encoding='utf-8') as f:
                resume_data = json.load(f)
                return resume_data.get('last_processed_id')
        except Exception as e:
            self.log(f'WARNING: Failed to load resume state: {e}', 'WARNING')
            return None

    def update_product(self, product, category_name, subcategory_name):
        """Update product with category and subcategory"""
        category = self.find_category(category_name)
        subcategory = None
        
        if category and subcategory_name:
            subcategory = self.find_subcategory(subcategory_name, category)
        
        if not category:
            self.log(f'  WARNING: Category "{category_name}" not found in database', 'WARNING')
            return False
        
        if subcategory_name and not subcategory:
            self.log(f'  WARNING: Subcategory "{subcategory_name}" not found under "{category_name}"', 'WARNING')
            # Still update with category only
        
        try:
            product.category = category
            product.subcategory = subcategory
            product.save()
            
            # Save resume state after successful update
            self.save_resume_state(product.id)
            
            return True
        except Exception as e:
            self.log(f'  ERROR updating product: {e}', 'ERROR')
            return False

    def handle(self, *args, **options):
        self.options = options
        
        # Setup logging
        self.setup_logging(options.get('resume_file'))
        
        # Handle resume functionality
        if options['resume']:
            self.last_processed_id = self.load_resume_state()
            if self.last_processed_id:
                self.log(f'Resuming from product ID: {self.last_processed_id}', 'SUCCESS')
            else:
                self.log(f'No resume state found. Starting from beginning.', 'WARNING')
        
        # Log options
        self.log(f'Options: {json.dumps(options, indent=2, default=str)}')
        
        # Check if categories exist in database
        category_count = Category.objects.filter(parent__isnull=True).count()
        if category_count == 0:
            self.log(f'WARNING: No categories found in database!', 'WARNING')
            self.log(f'Please run: python manage.py import_categories', 'WARNING')
            self.log(f'Continuing anyway - categories will be created automatically if needed...', 'WARNING')
        else:
            self.log(f'Found {category_count} parent categories in database')
        
        # Setup OpenAI client
        try:
            api_key = options.get('api_key')
            if api_key:
                # Log that API key was provided (but don't log the actual key)
                self.log(f'Using API key from command line argument')
            else:
                self.log(f'Using API key from OPENAI_API_KEY environment variable')
            
            self.setup_openai_client(api_key)
        except Exception as e:
            self.log(f'Failed to setup OpenAI client: {e}', 'ERROR')
            self.log(f'Please verify your API key is correct and has not expired.', 'ERROR')
            self.log(f'You can get a new API key at: https://platform.openai.com/account/api-keys', 'ERROR')
            return
        
        # Get products to process
        queryset = Product.objects.all()
        
        # Resume from last processed product if --resume is used
        if options['resume'] and self.last_processed_id:
            queryset = queryset.filter(id__gt=self.last_processed_id)
            self.log(f'Resuming: Skipping products with ID <= {self.last_processed_id}')
        
        if options['skip_existing']:
            queryset = queryset.filter(
                category__isnull=True,
                subcategory__isnull=True
            )
        
        # Order by ID to ensure consistent processing order
        queryset = queryset.order_by('id')
        
        if options['limit'] > 0:
            queryset = queryset[:options['limit']]
        
        total_products = queryset.count()
        self.log(f'Total products to process: {total_products}')
        
        # Process products
        for idx, product in enumerate(queryset, 1):
            self.stats['processed'] += 1
            
            # Update last processed ID (even if it fails, we'll skip it next time)
            self.last_processed_id = product.id
            
            self.log(f'PRODUCT_START: ID={product.id}, Name={product.name}, Slug={product.slug}')
            
            try:
                # Classify product
                self.log(f'  Sending to LLM: {product.name}')
                classification = self.classify_product(product.name, options['model'])
                
                category_name = classification.get('category', '')
                subcategory_name = classification.get('subcategory', '')
                
                self.log(f'  LLM Response: category="{category_name}", subcategory="{subcategory_name}"')
                
                # Update product
                if self.update_product(product, category_name, subcategory_name):
                    self.stats['updated'] += 1
                    self.log(f'  PRODUCT_UPDATED: category={category_name}, subcategory={subcategory_name or "None"}')
                else:
                    self.stats['errors'] += 1
                    self.log(f'  PRODUCT_ERROR: Failed to update product', 'ERROR')
                
                # Delay between requests
                if idx < total_products:
                    time.sleep(options['delay'])
                    
            except Exception as e:
                self.stats['errors'] += 1
                self.log(f'  PRODUCT_ERROR: {str(e)}', 'ERROR')
                self.log(f'  Error details: {json.dumps({"product_id": product.id, "product_name": product.name, "error": str(e)})}')
            
            # Save resume state after each product (success or failure)
            # This ensures we can resume even if the script crashes
            self.save_resume_state(product.id)
            
            # Progress update
            if idx % 10 == 0:
                self.log(f'Progress: {idx}/{total_products} products processed')
                self.stdout.write(
                    self.style.SUCCESS(f'Progress: {idx}/{total_products} products processed')
                )
        
        # Final summary
        self.log('=== Classification Session Ended ===')
        self.log(f'Final Stats: {json.dumps(self.stats, indent=2)}')
        
        # Save final resume state
        if self.last_processed_id:
            self.save_resume_state(self.last_processed_id)
            self.log(f'Resume state saved. Last processed product ID: {self.last_processed_id}')
        
        # Close log file
        if self.log_file:
            self.log_file.close()
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('Classification Summary:'))
        self.stdout.write(f'  Processed: {self.stats["processed"]}')
        self.stdout.write(f'  Updated: {self.stats["updated"]}')
        self.stdout.write(f'  Skipped: {self.stats["skipped"]}')
        self.stdout.write(f'  Errors: {self.stats["errors"]}')
        self.stdout.write(f'  API Calls: {self.stats["api_calls"]}')
        self.stdout.write(self.style.SUCCESS('=' * 50))

