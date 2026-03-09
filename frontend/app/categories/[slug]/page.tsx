import { notFound } from 'next/navigation';
import CategoryProductsScreen from '@/components/screens/CategoryProductsScreen';

type PageProps = {
  params: { slug: string };
};

export default function Page({ params }: PageProps) {
  const { slug } = params;
  if (!slug) {
    notFound();
  }
  return <CategoryProductsScreen slug={slug} />;
}
