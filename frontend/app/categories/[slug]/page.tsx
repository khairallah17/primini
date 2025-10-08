import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

type PageProps = {
  params: { slug: string };
};

const CategoryProductsScreen = dynamic(() => import('../../../components/screens/CategoryProductsScreen'), {
  ssr: false
});

export default function Page({ params }: PageProps) {
  const { slug } = params;
  if (!slug) {
    notFound();
  }
  return <CategoryProductsScreen slug={slug} />;
}
