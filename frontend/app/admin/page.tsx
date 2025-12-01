import dynamic from 'next/dynamic';

const AdminDashboardScreen = dynamic(() => import('../../components/screens/AdminDashboardScreen'), { ssr: false });

export default function Page() {
  return <AdminDashboardScreen />;
}

