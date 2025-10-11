import dynamic from 'next/dynamic';

type PageProps = {
  searchParams: { q?: string };
};

const ProductListScreen = dynamic(() => import('../../components/screens/ProductListScreen'), { ssr: false });

export default function Page({ searchParams }: PageProps) {
  const query = searchParams.q ?? '';
  return (
    <ProductListScreen
      title={query ? `Résultats pour "${query}"` : 'Recherche'}
      endpoint="/products/"
      query={query ? { search: query } : {}}
    />
  );
}
