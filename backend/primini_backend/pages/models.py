from django.db import models
from django.utils.text import slugify


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
