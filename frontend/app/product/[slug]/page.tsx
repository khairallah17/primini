import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

type PageProps = {
  params: { slug: string };
};

const ProductDetailScreen = dynamic(() => import('../../../components/screens/ProductDetailScreen'), { ssr: false });

export default function Page({ params }: PageProps) {
  const { slug } = params;
  if (!slug) {
    notFound();
  }
  return <ProductDetailScreen slug={slug} />;
}
