import dynamic from 'next/dynamic';

const CategoriesScreen = dynamic(() => import('../../components/screens/CategoriesScreen'), { ssr: false });

export default function Page() {
  return <CategoriesScreen />;
}
