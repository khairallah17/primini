'use client';

import dynamic from 'next/dynamic';

const BlogFormScreen = dynamic(() => import('../../../../components/screens/BlogFormScreen'), { ssr: false });

export default function Page() {
  return <BlogFormScreen />;
}

