import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext.jsx';

export default function FavoriteBar() {
  const { items, removeFavorite, clearFavorites } = useFavorites();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 40 }}>
      {isOpen && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h4>Ma sélection</h4>
            <button onClick={() => setIsOpen(false)} style={styles.closeButton}>×</button>
          </div>
          {items.length === 0 ? (
            <p>Ajoutez vos produits favoris pour les retrouver rapidement.</p>
          ) : (
            <ul style={styles.list}>
              {items.map((item) => (
                <li key={item.id} style={styles.listItem}>
                  <Link to={`/product/${item.slug}`}>{item.name}</Link>
                  <button onClick={() => removeFavorite(item.id)} style={styles.removeButton}>
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <button onClick={clearFavorites} style={styles.clearButton}>
              Vider la sélection
            </button>
          )}
        </div>
      )}
      <button onClick={() => setIsOpen((value) => !value)} style={styles.fab}>
        Ma sélection ({items.length})
      </button>
    </div>
  );
}

const styles = {
  fab: {
    background: '#f97316',
    color: 'white',
    border: 'none',
    borderRadius: '999px',
    padding: '0.75rem 1.5rem',
    fontWeight: 600,
    boxShadow: '0 15px 35px rgba(249, 115, 22, 0.35)',
  },
  panel: {
    background: 'white',
    borderRadius: '18px',
    boxShadow: '0 25px 60px rgba(28, 19, 54, 0.25)',
    padding: '1.5rem',
    marginBottom: '1rem',
    width: '280px',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  closeButton: {
    border: 'none',
    background: 'transparent',
    fontSize: '1.25rem',
    cursor: 'pointer',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gap: '0.75rem',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeButton: {
    border: 'none',
    background: 'transparent',
    color: '#f97316',
    cursor: 'pointer',
  },
  clearButton: {
    border: 'none',
    background: '#7c3aed',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '12px',
    marginTop: '1rem',
    width: '100%',
  },
};
