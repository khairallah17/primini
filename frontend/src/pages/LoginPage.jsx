import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
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
      await login(form);
      navigate('/');
    } catch (err) {
      setError("Connexion impossible. Vérifiez vos identifiants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card" style={styles.container}>
      <h1>Connexion</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label>
          Adresse e-mail
          <input name="email" type="email" value={form.email} onChange={handleChange} required style={styles.input} />
        </label>
        <label>
          Mot de passe
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </label>
        {error && <p style={{ color: '#f97316' }}>{error}</p>}
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p>
        <Link to="/forgot-password">Mot de passe oublié ?</Link>
      </p>
      <p>
        Pas encore de compte ? <Link to="/register">Créer un compte</Link>
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
