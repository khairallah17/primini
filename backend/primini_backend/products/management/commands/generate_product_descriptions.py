"""
Management command to generate detailed product descriptions with technical specs using ChatGPT.

This command:
1. Iterates through all products in the database
2. Sends product information to ChatGPT/OpenAI
3. Gets a detailed description with technical specifications in French
4. Updates the product description field
5. Generates detailed logs of the process
"""

import json
import os
import time
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings

from primini_backend.products.models import Product

# Try to import OpenAI
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class Command(BaseCommand):
    help = 'Generate detailed product descriptions with technical specs using ChatGPT'

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
        self.options = {}

    def setup_logging(self, resume_file_path=None):
        """Create log file with timestamp"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backend_dir = Path(settings.BASE_DIR)
        log_file_path = backend_dir / f'generate_descriptions_{timestamp}.log'
        
        # Setup resume file
        if resume_file_path:
            self.resume_file = Path(resume_file_path)
        else:
            self.resume_file = backend_dir / 'generate_descriptions_resume.json'
        
        # Ensure the directory exists
        log_file_path.parent.mkdir(parents=True, exist_ok=True)
        self.resume_file.parent.mkdir(parents=True, exist_ok=True)
        
        self.log_file = open(log_file_path, 'w', encoding='utf-8')
        self.stdout.write(self.style.SUCCESS(f'Log file: {log_file_path}'))
        self.stdout.write(self.style.SUCCESS(f'Resume file: {self.resume_file}'))
        
        self.log('=== Description Generation Session Started ===')
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
        
        self.log(f'OpenAI client initialized with model: gpt-4o')

    def get_product_type_guidance(self, product):
        """Automatically determine product type and return appropriate guidance"""
        category_name = product.category.name.lower() if product.category else ""
        subcategory_name = product.subcategory.name.lower() if product.subcategory else ""
        product_name_lower = product.name.lower()
        
        # Determine product type based on category and subcategory
        if any(term in category_name or term in subcategory_name or term in product_name_lower 
               for term in ['smartphone', 'téléphonie', 'tablette', 'tablet', 'phone', 'mobile']):
            return {
                'type': 'smartphone_tablette',
                'sections': 'Écran, Appareil photo, Processeur, Mémoire, Stockage, Batterie, Dimensions, Authentification biométrique, Connectivité, Autres fonctionnalités',
                'guidance': 'Inclus les détails de l\'écran (taille, résolution, technologie), caméras (MP, ouverture, zoom), processeur (modèle, fréquence), RAM, stockage, batterie (capacité, charge rapide), dimensions, empreinte digitale/facial, 5G/WiFi/Bluetooth, résistance à l\'eau, etc.'
            }
        elif any(term in category_name or term in subcategory_name or term in product_name_lower 
                 for term in ['ordinateur', 'laptop', 'pc', 'computer', 'portable', 'desktop']):
            return {
                'type': 'ordinateur',
                'sections': 'Processeur, RAM, Stockage, Écran, Carte graphique, Batterie, Dimensions, Ports et connectivité, Clavier et trackpad, Autres caractéristiques',
                'guidance': 'Inclus le modèle de processeur (Intel/AMD, génération, nombre de cœurs), quantité de RAM, type et capacité de stockage (SSD/HDD), taille et résolution d\'écran, carte graphique dédiée/intégrée, autonomie batterie, poids, ports USB/HDMI/Thunderbolt, etc.'
            }
        elif any(term in category_name or term in subcategory_name or term in product_name_lower 
                 for term in ['électroménager', 'aspirateur', 'machine à laver', 'réfrigérateur', 'four', 'lave-vaisselle', 'climatiseur']):
            return {
                'type': 'electromenager',
                'sections': 'Capacité, Puissance, Dimensions, Fonctions et programmes, Consommation énergétique, Niveau sonore, Matériaux et finition, Autres caractéristiques',
                'guidance': 'Inclus la capacité (litres/kg), puissance (watts), dimensions (largeur x profondeur x hauteur), programmes et fonctions disponibles, classe énergétique, niveau sonore en dB, matériaux utilisés, certifications, etc.'
            }
        elif any(term in category_name or term in subcategory_name or term in product_name_lower 
                 for term in ['écouteur', 'casque', 'haut-parleur', 'audio', 'son', 'microphone', 'téléviseur', 'tv']):
            return {
                'type': 'audio_video',
                'sections': 'Puissance et qualité audio, Connectivité, Dimensions et poids, Batterie (si applicable), Fonctions spéciales, Autres caractéristiques',
                'guidance': 'Inclus la puissance (watts), qualité audio (fréquences, drivers), connectivité (Bluetooth, filaire, NFC), dimensions, autonomie batterie pour appareils portables, fonctions (réduction de bruit, égaliseur), compatibilité, etc.'
            }
        elif any(term in category_name or term in subcategory_name or term in product_name_lower 
                 for term in ['appareil photo', 'caméra', 'objectif', 'photo']):
            return {
                'type': 'photo',
                'sections': 'Capteur, Objectif, Vidéo, Dimensions et poids, Connectivité, Batterie, Autres caractéristiques',
                'guidance': 'Inclus la taille du capteur (MP, type), objectif (focale, ouverture), capacités vidéo (résolution, fps), dimensions, poids, connectivité WiFi/Bluetooth, autonomie, stabilisation, etc.'
            }
        elif any(term in category_name or term in subcategory_name or term in product_name_lower 
                 for term in ['composant', 'processeur', 'carte graphique', 'ram', 'stockage', 'ssd', 'disque']):
            return {
                'type': 'composant',
                'sections': 'Spécifications techniques, Performances, Compatibilité, Dimensions, Consommation, Autres caractéristiques',
                'guidance': 'Inclus les spécifications détaillées (fréquence, capacité, interface), performances attendues, compatibilité (socket, format), dimensions physiques, consommation énergétique, garantie, etc.'
            }
        elif any(term in category_name or term in subcategory_name or term in product_name_lower 
                 for term in ['accessoire', 'câble', 'chargeur', 'coque', 'étui', 'support']):
            return {
                'type': 'accessoire',
                'sections': 'Matériaux, Dimensions, Compatibilité, Fonctions, Autres caractéristiques',
                'guidance': 'Inclus les matériaux de construction, dimensions précises, compatibilité avec les modèles/appareils, fonctions spéciales, certifications, etc.'
            }
        elif any(term in category_name or term in subcategory_name or term in product_name_lower 
                 for term in ['santé', 'beauté', 'parfum', 'maquillage', 'soin']):
            return {
                'type': 'sante_beaute',
                'sections': 'Composition, Volume/Quantité, Utilisation, Ingrédients actifs, Type de peau, Autres caractéristiques',
                'guidance': 'Inclus la composition, volume ou quantité, mode d\'utilisation, ingrédients actifs, type de peau ciblé, certifications (bio, hypoallergénique), etc.'
            }
        else:
            # Default guidance for unknown product types
            return {
                'type': 'general',
                'sections': 'Caractéristiques principales, Spécifications techniques, Dimensions, Fonctions, Autres caractéristiques',
                'guidance': 'Inclus toutes les caractéristiques techniques pertinentes, spécifications détaillées, dimensions, fonctions principales, et toute autre information importante pour ce type de produit.'
            }

    def build_description_prompt(self, product):
        """Build the prompt for generating product description"""
        category_info = ""
        if product.category:
            category_info = f"Catégorie: {product.category.name}"
            if product.subcategory:
                category_info += f" / Sous-catégorie: {product.subcategory.name}"
        
        brand_info = f"Marque: {product.brand}" if product.brand else ""
        
        existing_specs = ""
        if product.specs and isinstance(product.specs, dict) and product.specs:
            existing_specs = f"\n\nSpécifications existantes (utilisez-les comme référence si disponibles):\n{json.dumps(product.specs, indent=2, ensure_ascii=False)}"
        
        # Automatically determine product type and get guidance
        type_info = self.get_product_type_guidance(product)
        
        prompt = f"""Tu es un expert en rédaction de descriptions de produits techniques. Génère une description détaillée, complète et professionnelle en français pour le produit suivant.

Nom du produit: {product.name}
{brand_info}
{category_info}
{existing_specs}

Type de produit détecté: {type_info['type']}

Instructions importantes:
1. Génère une description technique complète et détaillée en français avec toutes les caractéristiques pertinentes
2. Structure la description de manière claire et organisée avec les sections suivantes (adapte selon le produit):
   {type_info['sections']}

3. Guidance spécifique pour ce type de produit:
   {type_info['guidance']}

4. Inclus toutes les spécifications techniques importantes:
   - Des valeurs numériques précises avec unités de mesure appropriées
   - Des détails techniques complets (résolutions, fréquences, capacités, etc.)
   - Des technologies spécifiques et certifications
   - Des dimensions et poids si pertinents
   - Toutes autres caractéristiques importantes pour ce type de produit

5. Utilise un formatage clair avec des sauts de ligne entre les sections
6. Sois précis et technique, mais reste compréhensible pour un utilisateur moyen
7. Si certaines informations ne sont pas disponibles dans les spécifications existantes, utilise tes connaissances générales sur ce type de produit pour fournir des informations réalistes et pertinentes
8. La description doit être complète, professionnelle et prête à être utilisée sur un site e-commerce
9. Adapte automatiquement le niveau de détail selon le type de produit (plus technique pour les composants, plus orienté utilisateur pour les accessoires)

Génère maintenant la description complète et détaillée du produit en français."""

        return prompt

    def generate_description(self, product):
        """Generate product description using OpenAI"""
        if not self.client:
            raise ValueError('OpenAI client not initialized')
        
        try:
            prompt = self.build_description_prompt(product)
            
            self.log(f'PRODUCT_START: ID={product.id}, Name="{product.name}", Category={product.category.name if product.category else "None"}, Brand={product.brand or "None"}')
            self.log(f'PROMPT: {prompt[:500]}...' if len(prompt) > 500 else f'PROMPT: {prompt}')
            
            self.stats['api_calls'] += 1
            start_time = time.time()
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "Tu es un expert en rédaction de descriptions techniques de produits électroniques et électroménagers. Tu génères des descriptions détaillées, précises et bien structurées en français."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=2000,
            )
            
            elapsed_time = time.time() - start_time
            
            if not response.choices or not response.choices[0].message.content:
                self.log(f'PRODUCT_ERROR: ID={product.id}, Error="No response from OpenAI"', 'ERROR')
                return None
            
            description = response.choices[0].message.content.strip()
            description_length = len(description)
            
            # Log response details
            usage = response.usage
            self.log(f'API_RESPONSE: ID={product.id}, Tokens={usage.total_tokens if usage else "N/A"}, Prompt_tokens={usage.prompt_tokens if usage else "N/A"}, Completion_tokens={usage.completion_tokens if usage else "N/A"}, Time={elapsed_time:.2f}s')
            self.log(f'DESCRIPTION_GENERATED: ID={product.id}, Length={description_length} characters')
            self.log(f'DESCRIPTION_PREVIEW: {description[:200]}...' if description_length > 200 else f'DESCRIPTION_PREVIEW: {description}')
            
            return description
            
        except Exception as e:
            error_msg = str(e)
            if hasattr(e, 'response') and hasattr(e.response, 'json'):
                error_data = e.response.json()
                error_msg = f"Error code: {e.status_code} - {error_data}"
            elif hasattr(e, 'status_code'):
                error_msg = f"Error code: {e.status_code} - {error_msg}"
            
            self.log(f'PRODUCT_ERROR: ID={product.id}, Error="{error_msg}"', 'ERROR')
            return None

    def load_resume_state(self):
        """Load the last processed product ID from resume file"""
        if self.resume_file and self.resume_file.exists():
            try:
                with open(self.resume_file, 'r') as f:
                    state = json.load(f)
                    self.last_processed_id = state.get('last_product_id', 0)
                    return self.last_processed_id
            except Exception as e:
                self.log(f'Could not load resume state: {e}', 'WARNING')
                return 0
        return 0

    def save_resume_state(self, product_id):
        """Save the last processed product ID to resume file"""
        if not self.resume_file:
            return
        
        try:
            with open(self.resume_file, 'w') as f:
                json.dump({'last_product_id': product_id}, f)
            self.last_processed_id = product_id
        except Exception as e:
            self.log(f'Could not save resume state: {e}', 'WARNING')


    def add_arguments(self, parser):
        parser.add_argument(
            '--api-key',
            type=str,
            help='OpenAI API key (or set OPENAI_API_KEY environment variable)'
        )
        parser.add_argument(
            '--resume',
            action='store_true',
            help='Resume from the last processed product'
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip products that already have a description (default: process all products)'
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing descriptions (default: skip products with descriptions unless --skip-existing is not used)'
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=1.0,
            help='Delay between API calls in seconds (default: 1.0)'
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='Limit the number of products to process'
        )
        parser.add_argument(
            '--resume-file',
            type=str,
            default=None,
            help='Path to resume file (default: auto-generated)'
        )

    def handle(self, *args, **options):
        self.options = options
        
        if not OPENAI_AVAILABLE:
            self.stdout.write(
                self.style.ERROR(
                    'OpenAI library is not installed. Install it with: pip install openai'
                )
            )
            return
        
        # Setup logging
        self.setup_logging(options.get('resume_file'))
        
        # Setup OpenAI client
        try:
            self.setup_openai_client(options.get('api_key'))
        except Exception as e:
            self.log(f'Failed to initialize OpenAI client: {e}', 'ERROR')
            if self.log_file:
                self.log_file.close()
            return
        
        # Get products to process
        products = Product.objects.all().order_by('id')
        
        if options.get('skip_existing'):
            # Skip products that already have descriptions
            products = products.filter(description__isnull=True) | products.filter(description='')
            self.log('Skipping products that already have descriptions')
        elif options.get('overwrite'):
            # Process all products, overwriting existing descriptions
            self.log('Processing all products (will overwrite existing descriptions)')
        else:
            # Default: process all products (including those with descriptions)
            self.log('Processing all products (will update existing descriptions)')
        
        # Resume from last processed product if requested
        if options.get('resume'):
            last_id = self.load_resume_state()
            products = products.filter(id__gt=last_id)
            self.log(f'Resuming from product ID {last_id}')
        
        # Apply limit if specified
        if options.get('limit'):
            products = products[:options['limit']]
        
        total_products = products.count()
        self.log(f'Starting to process {total_products} products')
        self.log(f'Options: delay={options.get("delay", 1.0)}s, skip_existing={options.get("skip_existing", False)}, limit={options.get("limit", "None")}')
        
        delay = options.get('delay', 1.0)
        
        for index, product in enumerate(products, 1):
            self.log(f'\n[{index}/{total_products}] Processing product ID {product.id}: {product.name}')
            self.stats['processed'] += 1
            
            try:
                description = self.generate_description(product)
                
                if description:
                    with transaction.atomic():
                        product.description = description
                        product.save(update_fields=['description'])
                    
                    self.log(f'PRODUCT_SUCCESS: ID={product.id}, Description saved ({len(description)} characters)', 'SUCCESS')
                    self.stats['updated'] += 1
                else:
                    self.log(f'PRODUCT_FAILED: ID={product.id}, Failed to generate description', 'WARNING')
                    self.stats['errors'] += 1
                
                # Save resume state
                self.save_resume_state(product.id)
                
                # Delay between requests to respect rate limits
                if index < total_products:
                    time.sleep(delay)
                    
            except Exception as e:
                error_msg = str(e)
                if hasattr(e, 'response') and hasattr(e.response, 'json'):
                    error_data = e.response.json()
                    error_msg = f"Error code: {e.status_code} - {error_data}"
                elif hasattr(e, 'status_code'):
                    error_msg = f"Error code: {e.status_code} - {error_msg}"
                
                self.log(f'PRODUCT_ERROR: ID={product.id}, Error="{error_msg}"', 'ERROR')
                self.stats['errors'] += 1
        
        # Summary
        self.log('\n' + '=' * 60)
        self.log('=== Session Summary ===')
        self.log(f'Total processed: {self.stats["processed"]}')
        self.log(f'Successfully updated: {self.stats["updated"]}')
        self.log(f'Errors: {self.stats["errors"]}')
        self.log(f'API calls made: {self.stats["api_calls"]}')
        self.log('=' * 60)
        
        if self.log_file:
            self.log_file.close()
        
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted: {self.stats["updated"]} successful, {self.stats["errors"]} failed'
            )
        )

