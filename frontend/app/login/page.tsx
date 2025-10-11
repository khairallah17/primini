import dynamic from 'next/dynamic';

const LoginScreen = dynamic(() => import('../../components/screens/LoginScreen'), { ssr: false });

export default function Page() {
  return <LoginScreen />;
}
