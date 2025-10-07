import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext.jsx';

export default function ProductCard({ product }) {
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const favorite = isFavorite(product.id);

  const toggleFavorite = () => {
    if (favorite) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'grid', gap: '1rem' }}>
        <img
          src={product.image || 'https://via.placeholder.com/400x260?text=Primini'}
          alt={product.name}
          style={{ borderRadius: '12px', width: '100%', objectFit: 'cover', aspectRatio: '4 / 3' }}
        />
        <div>
          <Link to={`/product/${product.slug}`} style={{ fontWeight: 600, fontSize: '1.1rem' }}>
            {product.name}
          </Link>
          <p style={{ margin: '0.5rem 0', color: '#6b7280' }}>{product.brand}</p>
          {product.lowest_price && (
            <p style={{ fontWeight: 700, color: '#7c3aed' }}>{Number(product.lowest_price).toFixed(2)} MAD</p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {product.tags?.slice(0, 3).map((tag) => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>
        </div>
        <button onClick={toggleFavorite} style={styles.favoriteButton}>
          {favorite ? 'Retirer de ma sélection' : 'Ajouter à ma sélection'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  favoriteButton: {
    border: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    background: '#f5f3ff',
    color: '#7c3aed',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
