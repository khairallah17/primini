'use client';

import dynamic from 'next/dynamic';

const BlogListScreen = dynamic(() => import('../../components/screens/BlogListScreen'), { ssr: false });

export default function Page() {
  return <BlogListScreen />;
}

