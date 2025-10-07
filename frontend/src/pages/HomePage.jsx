import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Carousel from '../components/Carousel.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { fetchHomeContent } from '../api/client.js';

export default function HomePage() {
  const [content, setContent] = useState({ categories: [], promotions: [], popular: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeContent()
      .then(setContent)
      .catch(() => setContent({ categories: [], promotions: [], popular: [] }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <section className="hero">
        <h1>Trouvez le meilleur prix avant d’acheter</h1>
        <p>
          Explorez des milliers de produits tech, comparez les offres de marchands fiables et créez des alertes
          pour ne jamais manquer une promotion.
        </p>
      </section>

      {loading ? (
        <p>Chargement des nouveautés…</p>
      ) : (
        <>
          <section className="card">
            <div className="section-title">
              <h2>Catégories populaires</h2>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              {content.categories.map((category) => (
                <Link key={category.slug} to={`/categories/${category.slug}`} style={styles.categoryCard}>
                  {category.icon && <img src={category.icon} alt="" style={styles.categoryIcon} />}
                  <span>{category.name}</span>
                </Link>
              ))}
            </div>
          </section>

          <Carousel
            title="Promotions du moment"
            items={content.promotions}
            renderItem={(promotion) => (
              <div className="card" style={{ height: '100%' }}>
                <h3>{promotion.title}</h3>
                <p style={{ color: '#6b7280' }}>{promotion.description}</p>
                <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
                  {promotion.products?.slice(0, 2).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          />

          <Carousel
            title="Produits populaires"
            items={content.popular.map((entry) => entry.product)}
            renderItem={(product) => <ProductCard product={product} />}
          />
        </>
      )}

      <section className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <h2>Pourquoi choisir Primini.ma ?</h2>
        <p style={{ maxWidth: '640px', margin: '1rem auto', color: '#6b7280' }}>
          Une expérience fluide pour comparer, suivre et acheter vos produits tech préférés au meilleur prix. Alerts
          personnalisées, marchands vérifiés et recommandations adaptées à vos besoins.
        </p>
      </section>
    </div>
  );
}

const styles = {
  categoryCard: {
    background: '#ede9fe',
    borderRadius: '18px',
    padding: '1rem',
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    fontWeight: 600,
    color: '#4c1d95',
    minHeight: '140px',
  },
  categoryIcon: {
    width: '48px',
    height: '48px',
    objectFit: 'contain',
    marginBottom: '0.75rem',
  },
};
