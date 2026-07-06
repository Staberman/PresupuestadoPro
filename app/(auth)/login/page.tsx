'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      router.push('/dashboard');
    } catch (err) {
      const code = (err as { code?: string }).code;
      const msg = code === 'auth/invalid-credential'  ? 'Email o contraseña incorrectos.' :
                  code === 'auth/email-already-in-use' ? 'Ese email ya está registrado.' :
                  code === 'auth/weak-password'        ? 'La contraseña debe tener al menos 6 caracteres.' :
                  'Ocurrió un error. Intentá de nuevo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f2d6e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'white',
        borderRadius: '18px',
        padding: '40px 32px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 24px 64px rgba(10,30,80,.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '1.6rem',
            fontWeight: '800',
            color: '#0f2d6e',
            letterSpacing: '-0.02em',
          }}>
            Presupuesto<span style={{ color: '#1a56e8' }}>Pro</span>
          </div>
          <div style={{ fontSize: '.85rem', color: '#7888a8', marginTop: '6px' }}>
            {isRegistering ? 'Creá tu cuenta gratis' : 'Iniciá sesión en tu cuenta'}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: '600', color: '#364061', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px',
                border: '1.5px solid #dde3f5', fontSize: '.9rem',
                outline: 'none', color: '#0e1b3d',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: '600', color: '#364061', marginBottom: '6px' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px',
                border: '1.5px solid #dde3f5', fontSize: '.9rem',
                outline: 'none', color: '#0e1b3d',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#c41c1c', borderRadius: '8px',
              padding: '10px 14px', fontSize: '.82rem', marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px', borderRadius: '10px',
              background: loading ? '#93adf5' : '#1a56e8',
              color: 'white', fontWeight: '700', fontSize: '.95rem',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {loading ? 'Cargando...' : isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Toggle */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '.84rem', color: '#7888a8' }}>
          {isRegistering ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}{' '}
          <span
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            style={{ color: '#1a56e8', fontWeight: '600', cursor: 'pointer' }}
          >
            {isRegistering ? 'Iniciá sesión' : 'Registrate gratis'}
          </span>
        </div>
      </div>
    </div>
  );
}