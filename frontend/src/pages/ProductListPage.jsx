import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import FiltersSidebar from '../components/FiltersSidebar.jsx';
import { fetchProducts } from '../api/client.js';

export default function ProductListPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(true);

  const filters = useMemo(() => ({
    brand: searchParams.get('brand') || '',
    price_min: searchParams.get('price_min') || '',
    price_max: searchParams.get('price_max') || '',
  }), [searchParams]);

  const page = Number(searchParams.get('page') || 1);

  useEffect(() => {
    const params = { ...Object.fromEntries(searchParams.entries()), page };
    if (slug) {
      params.category = slug;
    }
    setLoading(true);
    fetchProducts(params)
      .then((data) => {
        setProducts(data.results || data);
        setMeta({ count: data.count || data.length, next: data.next, previous: data.previous });
      })
      .finally(() => setLoading(false));
  }, [slug, searchParams, page]);

  const handleFiltersChange = (nextFilters) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value) {
        updated.set(key, value);
      } else {
        updated.delete(key);
      }
    });
    updated.delete('page');
    setSearchParams(updated);
  };

  const goToPage = (target) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('page', String(target));
    setSearchParams(updated);
  };

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <header>
        <h1>{slug ? `Catégorie : ${slug}` : 'Tous les produits'}</h1>
        <p>Affinez votre recherche avec les filtres pour trouver le meilleur prix.</p>
      </header>
      <div className="product-layout">
        <FiltersSidebar filters={filters} onChange={handleFiltersChange} />
        <div>
          {loading ? (
            <p>Chargement des produits…</p>
          ) : (
            <>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div style={styles.pagination}>
                <button
                  style={styles.pageButton}
                  disabled={page <= 1 || !meta.previous}
                  onClick={() => goToPage(page - 1)}
                >
                  Précédent
                </button>
                <span>Page {page}</span>
                <button
                  style={styles.pageButton}
                  disabled={!meta.next}
                  onClick={() => goToPage(page + 1)}
                >
                  Suivant
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const styles = {
  pagination: {
    marginTop: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
  },
  pageButton: {
    border: 'none',
    borderRadius: '12px',
    padding: '0.5rem 1rem',
    background: '#ede9fe',
    color: '#7c3aed',
    fontWeight: 600,
  },
};
