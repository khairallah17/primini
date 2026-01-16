import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import MainContent from '../components/layouts/MainContent';
import ConditionalHeaderFooter from '../components/layouts/ConditionalHeaderFooter';

export const metadata: Metadata = {
  title: 'Avita — Comparateur de prix high-tech au Maroc',
  description:
    'Comparez les prix des smartphones, TV, électroménagers et produits high-tech au Maroc sur Avita.',
  icons: {
    icon: '/images/avito-colors.jpeg',
    shortcut: '/images/avito-colors.jpeg',
    apple: '/images/avito-colors.jpeg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="flex h-full flex-col bg-white text-gray-900">
        <Providers>
          <ConditionalHeaderFooter>
            <MainContent>{children}</MainContent>
          </ConditionalHeaderFooter>
        </Providers>
      </body>
    </html>
  );
}
