import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProduct, createAlert } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setLoading(true);
    fetchProduct(slug)
      .then(setProduct)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <p>Chargement…</p>;
  }

  if (!product) {
    return <p>Produit introuvable.</p>;
  }

  const favorite = isFavorite(product.id);

  const toggleFavorite = () => {
    if (favorite) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  const submitAlert = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setAlertMessage('Connectez-vous pour créer une alerte.');
      return;
    }
    try {
      await createAlert({ product_id: product.id, threshold_price: alertPrice });
      setAlertMessage('Alerte créée avec succès !');
      setAlertPrice('');
    } catch (error) {
      setAlertMessage("Impossible de créer l'alerte.");
    }
  };

  return (
    <article style={{ display: 'grid', gap: '2rem' }}>
      <section className="card" style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'minmax(260px, 1fr) 1fr' }}>
        <img
          src={product.image || 'https://via.placeholder.com/480x360?text=Primini'}
          alt={product.name}
          style={{ width: '100%', borderRadius: '16px', objectFit: 'cover' }}
        />
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <h1>{product.name}</h1>
            <p style={{ color: '#6b7280' }}>{product.brand}</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {product.tags?.map((tag) => (
                <span key={tag} className="tag">#{tag}</span>
              ))}
            </div>
          </div>
          <button onClick={toggleFavorite} style={styles.favoriteButton}>
            {favorite ? 'Retirer de ma sélection' : 'Ajouter à ma sélection'}
          </button>
          <div>
            <h2>Offres disponibles</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {product.offers?.map((offer) => (
                <div key={offer.id} style={styles.offerRow}>
                  <div>
                    <strong>{offer.merchant.name}</strong>
                    <p style={{ margin: 0, color: '#6b7280' }}>{offer.stock_status}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 700 }}>{Number(offer.price).toFixed(2)} MAD</span>
                    <a href={offer.url} target="_blank" rel="noreferrer" style={styles.cta}>
                      Voir l’offre
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <form onSubmit={submitAlert} style={styles.alertForm}>
            <h3>Créer une alerte de prix</h3>
            <input
              type="number"
              placeholder="Prix souhaité"
              value={alertPrice}
              onChange={(event) => setAlertPrice(event.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.alertButton}>
              M’alerter
            </button>
            {alertMessage && <p style={{ margin: 0, color: '#f97316' }}>{alertMessage}</p>}
          </form>
        </div>
      </section>

      <section className="card" style={{ display: 'grid', gap: '1rem' }}>
        <h2>Description</h2>
        <p style={{ color: '#4b5563' }}>{product.description}</p>
        <h3>Caractéristiques techniques</h3>
        <div style={styles.specs}>
          {Object.entries(product.specs || {}).map(([key, value]) => (
            <div key={key} style={styles.specRow}>
              <span style={{ color: '#6b7280' }}>{key}</span>
              <strong>{String(value)}</strong>
            </div>
          ))}
        </div>
      </section>

      {product.similar_products?.length > 0 && (
        <section>
          <h2>Produits similaires</h2>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {product.similar_products.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

const styles = {
  favoriteButton: {
    border: 'none',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    background: '#ede9fe',
    color: '#7c3aed',
    fontWeight: 600,
  },
  offerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f5f3ff',
    padding: '1rem',
    borderRadius: '12px',
  },
  cta: {
    background: '#f97316',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    fontWeight: 600,
  },
  alertForm: {
    background: '#f8fafc',
    padding: '1rem',
    borderRadius: '12px',
    display: 'grid',
    gap: '0.75rem',
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: '1px solid #e0e7ff',
  },
  alertButton: {
    border: 'none',
    background: '#7c3aed',
    color: 'white',
    padding: '0.75rem 1.25rem',
    borderRadius: '12px',
    fontWeight: 600,
  },
  specs: {
    display: 'grid',
    gap: '0.75rem',
  },
  specRow: {
    display: 'flex',
    justifyContent: 'space-between',
    background: '#f9fafb',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
  },
};
