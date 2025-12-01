import dynamic from 'next/dynamic';

const UserDetailsScreen = dynamic(() => import('../../../../components/screens/UserDetailsScreen'), { ssr: false });

export default function Page() {
  return <UserDetailsScreen />;
}

