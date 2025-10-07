import { Route, Routes } from 'react-router-dom';

import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import FavoriteBar from './components/FavoriteBar.jsx';
import HomePage from './pages/HomePage.jsx';
import DealsPage from './pages/DealsPage.jsx';
import MagicToolPage from './pages/MagicToolPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import ProductListPage from './pages/ProductListPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import FaqPage from './pages/FaqPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import TermsPage from './pages/TermsPage.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/magic-tool" element={<MagicToolPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/categories/:slug" element={<ProductListPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq/*" element={<FaqPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
      </main>
      <Footer />
      <FavoriteBar />
    </div>
  );
}
