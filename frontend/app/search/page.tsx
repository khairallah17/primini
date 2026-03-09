import ProductListScreen from '@/components/screens/ProductListScreen';

type PageProps = {
  searchParams: { q?: string };
};

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
