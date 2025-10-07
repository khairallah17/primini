import { useState } from 'react';
import { requestPasswordReset } from '../api/client.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setMessage('Si un compte existe, un e-mail de réinitialisation a été envoyé.');
    } catch (error) {
      setMessage('Impossible de traiter votre demande pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card" style={styles.container}>
      <h1>Mot de passe oublié</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label>
          Adresse e-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={styles.input}
          />
        </label>
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>
      {message && <p>{message}</p>}
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
