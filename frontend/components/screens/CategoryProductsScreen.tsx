'use client';

import { useEffect, useState } from 'react';
import api from '../../lib/apiClient';
import type { Category } from '../../lib/types';
import ProductListScreen from './ProductListScreen';

type CategoryProductsScreenProps = {
  slug: string;
};

export default function CategoryProductsScreen({ slug }: CategoryProductsScreenProps) {
  const [category, setCategory] = useState<Category | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get<Category>(`/categories/${slug}/`);
        setCategory(response.data);
      } catch (error) {
        console.warn('Failed to load category', error);
      }
    }
    void load();
  }, [slug]);

  return (
    <ProductListScreen
      title={category ? category.name : 'Catégorie'}
      endpoint="/products/"
      query={{ category: slug }}
    />
  );
}
