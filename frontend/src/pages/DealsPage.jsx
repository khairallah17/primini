import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import { fetchDeals } from '../api/client.js';

export default function DealsPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeals({ page_size: 12 })
      .then((data) => setOffers(data.results || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <header>
        <h1>Bons Plans</h1>
        <p>Les meilleures offres du moment triées par prix croissant.</p>
      </header>
      {loading ? (
        <p>Chargement des offres…</p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {offers.map((offer) => (
            <div key={offer.id} className="card" style={{ display: 'grid', gap: '0.75rem' }}>
              <ProductCard product={offer.product} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{offer.merchant.name}</strong>
                  <p style={{ margin: 0, color: '#6b7280' }}>{offer.stock_status}</p>
                </div>
                <a href={offer.url} target="_blank" rel="noreferrer" style={styles.cta}>
                  {Number(offer.price).toFixed(2)} MAD
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const styles = {
  cta: {
    background: '#f97316',
    color: 'white',
    padding: '0.75rem 1.25rem',
    borderRadius: '12px',
    fontWeight: 700,
  },
};
