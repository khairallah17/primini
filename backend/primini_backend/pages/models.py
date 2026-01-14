from django.db import models
from django.utils.text import slugify
from django.conf import settings


class Page(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    body = models.TextField()

    class Meta:
        ordering = ['title']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class FaqEntry(models.Model):
    FAQ_TYPES = [
        ('general', 'Général'),
        ('products', 'Produits'),
        ('prices', 'Prix'),
        ('merchants', 'Marchands'),
    ]

    section = models.CharField(max_length=32, choices=FAQ_TYPES, default='general')
    question = models.CharField(max_length=255)
    answer = models.TextField()
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['section', 'position']

    def __str__(self):
        return self.question


class SiteSettings(models.Model):
    """Site-wide settings including AdSense configuration"""
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField(blank=True)
    description = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Site Setting"
        verbose_name_plural = "Site Settings"
        ordering = ['key']
    
    def __str__(self):
        return f"{self.key}: {self.value[:50]}"
    
    @classmethod
    def get_setting(cls, key, default=None):
        """Get a setting value by key"""
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default
    
    @classmethod
    def set_setting(cls, key, value, description=''):
        """Set a setting value by key"""
        setting, created = cls.objects.get_or_create(
            key=key,
            defaults={'value': value, 'description': description}
        )
        if not created:
            setting.value = value
            if description:
                setting.description = description
            setting.save()
        return setting


class BlogPost(models.Model):
    """Blog post model for SEO content"""
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('published', 'Publié'),
        ('archived', 'Archivé'),
    ]

    title = models.CharField(max_length=200, verbose_name='Titre')
    slug = models.SlugField(max_length=220, unique=True, blank=True, verbose_name='Slug')
    excerpt = models.TextField(max_length=500, blank=True, verbose_name='Extrait')
    content = models.TextField(verbose_name='Contenu')
    featured_image = models.ImageField(upload_to='blog/', blank=True, null=True, verbose_name='Image mise en avant')
    featured_image_url = models.URLField(blank=True, help_text='URL externe de l\'image mise en avant')
    
    # SEO fields
    meta_title = models.CharField(max_length=70, blank=True, verbose_name='Meta titre (SEO)')
    meta_description = models.TextField(max_length=160, blank=True, verbose_name='Meta description (SEO)')
    meta_keywords = models.CharField(max_length=255, blank=True, verbose_name='Mots-clés (SEO)')
    
    # Publishing fields
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name='Statut')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='blog_posts',
        verbose_name='Auteur'
    )
    published_at = models.DateTimeField(null=True, blank=True, verbose_name='Date de publication')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')

    class Meta:
        ordering = ['-published_at', '-created_at']
        verbose_name = 'Article de blog'
        verbose_name_plural = 'Articles de blog'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    @property
    def is_published(self):
        """Check if the blog post is published"""
        return self.status == 'published' and self.published_at is not None


class PageAdConfig(models.Model):
    """Page-specific ad configuration for custom backgrounds and AdSense codes"""
    PAGE_TYPE_CHOICES = [
        ('homepage', 'Page d\'accueil'),
        ('blog_list', 'Liste des blogs'),
        ('blog_detail', 'Détail du blog'),
        ('product_detail', 'Détail du produit'),
        ('category_list', 'Liste des catégories'),
        ('category_detail', 'Détail de la catégorie'),
        ('deals', 'Bons plans'),
        ('search', 'Recherche'),
        ('magic_tool', 'Outil magique'),
        ('dashboard', 'Tableau de bord'),
        ('faq', 'FAQ'),
        ('all', 'Toutes les pages'),
    ]

    AD_TYPE_CHOICES = [
        ('adsense', 'AdSense'),
        ('banner_image', 'Image bannière'),
        ('custom_code', 'Code personnalisé'),
    ]

    SLOT_CHOICES = [
        ('top', 'Haut'),
        ('middle', 'Milieu'),
        ('bottom', 'Bas'),
        ('sidebar', 'Barre latérale'),
        ('header', 'En-tête'),
        ('footer', 'Pied de page'),
    ]

    page_type = models.CharField(max_length=50, choices=PAGE_TYPE_CHOICES, verbose_name='Type de page')
    slot = models.CharField(max_length=50, choices=SLOT_CHOICES, verbose_name='Emplacement')
    ad_type = models.CharField(max_length=50, choices=AD_TYPE_CHOICES, verbose_name='Type d\'annonce')
    
    # AdSense configuration
    adsense_id = models.CharField(max_length=200, blank=True, verbose_name='ID AdSense')
    
    # Banner image configuration
    banner_image = models.ImageField(upload_to='adsense/banners/', blank=True, null=True, verbose_name='Image bannière')
    banner_image_url = models.URLField(blank=True, help_text='URL externe de l\'image bannière')
    banner_link = models.URLField(blank=True, verbose_name='Lien de la bannière')
    
    # Custom code
    custom_code = models.TextField(blank=True, verbose_name='Code personnalisé (HTML/JavaScript)')
    
    # Background image for the slot
    background_image = models.ImageField(upload_to='adsense/backgrounds/', blank=True, null=True, verbose_name='Image de fond')
    background_image_url = models.URLField(blank=True, help_text='URL externe de l\'image de fond')
    
    # Display settings
    enabled = models.BooleanField(default=True, verbose_name='Activé')
    order = models.PositiveIntegerField(default=0, verbose_name='Ordre d\'affichage')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')

    class Meta:
        ordering = ['page_type', 'slot', 'order']
        verbose_name = 'Configuration d\'annonce par page'
        verbose_name_plural = 'Configurations d\'annonces par page'
        unique_together = [('page_type', 'slot', 'order')]

    def __str__(self):
        return f"{self.get_page_type_display()} - {self.get_slot_display()} - {self.get_ad_type_display()}"
