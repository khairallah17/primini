import { useEffect, useState } from 'react';

export default function FiltersSidebar({ filters, onChange }) {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleRange = (event) => {
    const { name, value } = event.target;
    const next = { ...localFilters, [name]: value };
    setLocalFilters(next);
    onChange(next);
  };

  const handleBrand = (event) => {
    const { value } = event.target;
    const next = { ...localFilters, brand: value };
    setLocalFilters(next);
    onChange(next);
  };

  return (
    <aside className="filter-sidebar">
      <h3>Filtres</h3>
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="brand">Marque</label>
        <input
          id="brand"
          name="brand"
          value={localFilters.brand || ''}
          onChange={handleBrand}
          placeholder="Apple, Samsung…"
          style={styles.input}
        />
      </div>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div>
          <label>Prix min</label>
          <input
            type="number"
            name="price_min"
            value={localFilters.price_min || ''}
            onChange={handleRange}
            style={styles.input}
          />
        </div>
        <div>
          <label>Prix max</label>
          <input
            type="number"
            name="price_max"
            value={localFilters.price_max || ''}
            onChange={handleRange}
            style={styles.input}
          />
        </div>
      </div>
    </aside>
  );
}

const styles = {
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    marginTop: '0.35rem',
    borderRadius: '10px',
    border: '1px solid #e0e7ff',
  },
};
