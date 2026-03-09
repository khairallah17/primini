'use client';

import { notFound, useParams } from 'next/navigation';
import ProductDetailScreen from '@/components/screens/ProductDetailScreen';

export default function Page() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  
  if (!slug) {
    notFound();
  }
  
  return <ProductDetailScreen slug={slug} />;
}
