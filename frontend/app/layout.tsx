import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FavoriteBar from '../components/FavoriteBar';

export const metadata: Metadata = {
  title: 'Avita — Comparateur de prix high-tech au Maroc',
  description:
    'Comparez les prix des smartphones, TV, électroménagers et produits high-tech au Maroc sur Avita.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 text-slate-900">
        <Providers>
          <Header />
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
          <Footer />
          <FavoriteBar />
        </Providers>
      </body>
    </html>
  );
}
