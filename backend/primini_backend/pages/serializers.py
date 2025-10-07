from rest_framework import serializers

from .models import FaqEntry, Page


class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ['id', 'title', 'slug', 'body']


class FaqEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FaqEntry
        fields = ['id', 'section', 'question', 'answer', 'position']
