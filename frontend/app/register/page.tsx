import dynamic from 'next/dynamic';

const RegisterScreen = dynamic(() => import('../../components/screens/RegisterScreen'), { ssr: false });

export default function Page() {
  return <RegisterScreen />;
}
