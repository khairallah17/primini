import dynamic from 'next/dynamic';

const ProductFormScreen = dynamic(() => import('../../../components/screens/ProductFormScreen'), { ssr: false });

export default function Page() {
  return <ProductFormScreen />;
}

