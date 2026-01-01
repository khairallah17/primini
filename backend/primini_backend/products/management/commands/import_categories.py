"""
Management command to import categories and subcategories.

This command creates parent categories and their subcategories in the database.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from primini_backend.products.models import Category


# Category data matching the frontend structure
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
    help = 'Import categories and subcategories from predefined data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing categories before importing',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing categories...'))
            Category.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Categories cleared.'))

        self.stdout.write(self.style.SUCCESS('Starting category import...'))

        stats = {
            'parent_categories_created': 0,
            'parent_categories_updated': 0,
            'subcategories_created': 0,
            'subcategories_updated': 0,
        }

        for category_data in CATEGORIES_DATA['categories']:
            parent_name = category_data['name']
            subcategories = category_data.get('subcategories', [])

            # Create or update parent category
            parent_slug = slugify(parent_name)
            parent_category, created = Category.objects.update_or_create(
                slug=parent_slug,
                defaults={
                    'name': parent_name,
                    'parent': None,  # Ensure it's a parent category
                }
            )

            if created:
                stats['parent_categories_created'] += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Created parent category: {parent_name}')
                )
            else:
                stats['parent_categories_updated'] += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  ↻ Updated parent category: {parent_name}')
                )

            # Create or update subcategories
            for subcategory_name in subcategories:
                subcategory_slug = slugify(subcategory_name)
                subcategory, sub_created = Category.objects.update_or_create(
                    slug=subcategory_slug,
                    defaults={
                        'name': subcategory_name,
                        'parent': parent_category,
                    }
                )

                if sub_created:
                    stats['subcategories_created'] += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'    ✓ Created subcategory: {subcategory_name}')
                    )
                else:
                    stats['subcategories_updated'] += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'    ↻ Updated subcategory: {subcategory_name}')
                    )

        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('Import Summary:'))
        self.stdout.write(
            self.style.SUCCESS(
                f'  Parent categories created: {stats["parent_categories_created"]}'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'  Parent categories updated: {stats["parent_categories_updated"]}'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'  Subcategories created: {stats["subcategories_created"]}'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'  Subcategories updated: {stats["subcategories_updated"]}'
            )
        )
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Successfully imported {len(CATEGORIES_DATA["categories"])} parent categories '
                f'with {sum(len(cat["subcategories"]) for cat in CATEGORIES_DATA["categories"])} subcategories!'
            )
        )

