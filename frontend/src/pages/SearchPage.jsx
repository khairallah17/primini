import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { searchProducts } from '../api/client.js';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = Number(searchParams.get('page') || 1);
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState({ next: null, previous: null });

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    searchProducts(query, page).then((data) => {
      setResults(data.results || data);
      setMeta({ next: data.next, previous: data.previous });
    });
  }, [query, page]);

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <header>
        <h1>Recherche</h1>
        <p>
          Résultats pour « <strong>{query}</strong> »
        </p>
      </header>
      {results.length === 0 ? (
        <p>Aucun produit trouvé.</p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          disabled={!meta.previous}
          onClick={() => setSearchParams({ q: query, page: String(Math.max(1, page - 1)) })}
        >
          Précédent
        </button>
        <button
          disabled={!meta.next}
          onClick={() => setSearchParams({ q: query, page: String(page + 1) })}
        >
          Suivant
        </button>
      </div>
    </section>
  );
}
