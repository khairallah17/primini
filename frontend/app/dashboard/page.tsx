import dynamic from 'next/dynamic';

const ClientDashboardScreen = dynamic(() => import('../../components/screens/ClientDashboardScreen'), { ssr: false });

export default function Page() {
  return <ClientDashboardScreen />;
}

