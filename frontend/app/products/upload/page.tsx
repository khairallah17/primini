import dynamic from 'next/dynamic';

const CSVUploadScreen = dynamic(() => import('../../../components/screens/CSVUploadScreen'), { ssr: false });

export default function Page() {
  return <CSVUploadScreen />;
}

