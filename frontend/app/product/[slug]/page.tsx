'use client';

import dynamic from 'next/dynamic';
import { notFound, useParams } from 'next/navigation';

const ProductDetailScreen = dynamic(() => import('../../../components/screens/ProductDetailScreen'), { ssr: false });

export default function Page() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  
  if (!slug) {
    notFound();
  }
  
  return <ProductDetailScreen slug={slug} />;
}
