import dynamic from 'next/dynamic';

const UserManagementScreen = dynamic(() => import('../../../components/screens/UserManagementScreen'), { ssr: false });

export default function Page() {
  return <UserManagementScreen />;
}

