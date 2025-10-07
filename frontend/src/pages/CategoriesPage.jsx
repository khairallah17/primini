import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories } from '../api/client.js';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  return (
    <section className="card" style={{ display: 'grid', gap: '1.5rem' }}>
      <header>
        <h1>Catégories</h1>
        <p>Parcourez toutes les catégories et trouvez le produit idéal.</p>
      </header>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {categories.map((category) => (
          <div key={category.id} style={styles.category}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{category.name}</h3>
              <Link to={`/categories/${category.slug}`} style={styles.link}>
                Afficher tout
              </Link>
            </div>
            <ul style={styles.subList}>
              {category.children?.map((child) => (
                <li key={child.id}>
                  <Link to={`/categories/${child.slug}`}>{child.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

const styles = {
  category: {
    background: '#f5f3ff',
    padding: '1.5rem',
    borderRadius: '16px',
  },
  subList: {
    listStyle: 'none',
    padding: 0,
    margin: '1rem 0 0 0',
    display: 'grid',
    gap: '0.5rem',
  },
  link: {
    color: '#f97316',
    fontWeight: 600,
  },
};
