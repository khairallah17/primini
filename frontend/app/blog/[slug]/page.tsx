'use client';

import { notFound, useParams } from 'next/navigation';
import BlogDetailScreen from '@/components/screens/BlogDetailScreen';

export default function Page() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  
  if (!slug) {
    notFound();
  }
  
  return <BlogDetailScreen slug={slug} />;
}

