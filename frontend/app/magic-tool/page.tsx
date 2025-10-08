import dynamic from 'next/dynamic';

const MagicToolScreen = dynamic(() => import('../../components/screens/MagicToolScreen'), { ssr: false });

export default function Page() {
  return <MagicToolScreen />;
}
