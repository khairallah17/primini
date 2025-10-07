from rest_framework import viewsets

from .models import FaqEntry, Page
from .serializers import FaqEntrySerializer, PageSerializer


class PageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Page.objects.all()
    serializer_class = PageSerializer
    lookup_field = 'slug'


class FaqEntryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FaqEntrySerializer

    def get_queryset(self):
        queryset = FaqEntry.objects.all()
        section = self.request.query_params.get('section')
        if section:
            queryset = queryset.filter(section=section)
        return queryset
