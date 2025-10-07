import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/client.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password1: '', password2: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/login');
    } catch (err) {
      setError("Création de compte impossible. Vérifiez vos informations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card" style={styles.container}>
      <h1>Créer un compte</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label>
          Adresse e-mail
          <input name="email" type="email" value={form.email} onChange={handleChange} required style={styles.input} />
        </label>
        <label>
          Mot de passe
          <input
            name="password1"
            type="password"
            value={form.password1}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </label>
        <label>
          Confirmation du mot de passe
          <input
            name="password2"
            type="password"
            value={form.password2}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </label>
        {error && <p style={{ color: '#f97316' }}>{error}</p>}
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
      <p>
        Déjà inscrit ? <Link to="/login">Se connecter</Link>
      </p>
    </section>
  );
}

const styles = {
  container: {
    maxWidth: '420px',
    margin: '0 auto',
    display: 'grid',
    gap: '1.25rem',
  },
  form: {
    display: 'grid',
    gap: '1rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: '1px solid #e0e7ff',
    marginTop: '0.35rem',
  },
  button: {
    padding: '0.75rem 1.25rem',
    borderRadius: '12px',
    border: 'none',
    background: '#7c3aed',
    color: 'white',
    fontWeight: 600,
  },
};
