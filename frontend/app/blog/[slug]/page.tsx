'use client';

import dynamic from 'next/dynamic';
import { notFound, useParams } from 'next/navigation';

const BlogDetailScreen = dynamic(() => import('../../../components/screens/BlogDetailScreen'), { ssr: false });

export default function Page() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  
  if (!slug) {
    notFound();
  }
  
  return <BlogDetailScreen slug={slug} />;
}

