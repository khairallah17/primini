import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!search.trim()) return;
    navigate(`/search?q=${encodeURIComponent(search)}`);
  };

  return (
    <header style={styles.wrapper}>
      <div style={styles.logoArea}>
        <Link to="/" style={styles.logo}>
          Primini<span style={{ color: '#f97316' }}>.ma</span>
        </Link>
        <form onSubmit={handleSubmit} style={styles.searchForm}>
          <input
            type="search"
            placeholder="Rechercher un produit"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={styles.searchInput}
          />
        </form>
      </div>
      <nav style={styles.nav}>
        <NavLink to="/deals" style={styles.navLink}>
          Bons Plans
        </NavLink>
        <NavLink to="/magic-tool" style={styles.navLink}>
          L’outil magique
        </NavLink>
        <NavLink to="/categories" style={styles.navLink}>
          Catégories
        </NavLink>
      </nav>
      <div>
        {isAuthenticated ? (
          <button onClick={logout} style={styles.button}>
            Déconnexion ({user?.email})
          </button>
        ) : (
          <Link to="/login" style={styles.button}>
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 2rem',
    background: 'white',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 10px 30px rgba(91, 60, 225, 0.08)',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  logo: {
    fontWeight: 700,
    fontSize: '1.5rem',
    color: '#7c3aed',
  },
  searchForm: {
    background: '#f5f3ff',
    borderRadius: '999px',
    padding: '0.25rem 1rem',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: '1rem',
    width: '220px',
  },
  nav: {
    display: 'flex',
    gap: '1.5rem',
  },
  navLink: ({ isActive }) => ({
    color: isActive ? '#f97316' : '#4c1d95',
    fontWeight: isActive ? 700 : 500,
  }),
  button: {
    padding: '0.6rem 1.25rem',
    borderRadius: '999px',
    background: '#7c3aed',
    color: 'white',
    fontWeight: 600,
    border: 'none',
  },
};
