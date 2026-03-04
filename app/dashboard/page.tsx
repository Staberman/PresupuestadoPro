'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, profile, loading, isPro, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f2d6e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'white', fontSize: '1rem', fontFamily: 'sans-serif' }}>
          Cargando...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f7fc',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: '#0f2d6e', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem' }}>
          Presupuesto<span style={{ color: '#6389f0' }}>Pro</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            background: isPro ? 'rgba(26,86,232,.4)' : 'rgba(255,255,255,.1)',
            color: 'white', borderRadius: '20px', padding: '4px 12px',
            fontSize: '.75rem', fontWeight: '600',
          }}>
            {isPro ? (profile?.proStatus === 'lifetime' ? '💎 Pro Vitalicio' : '⭐ Pro') : 'Plan Gratuito'}
          </span>
          <button
            onClick={logout}
            style={{
              background: 'rgba(255,255,255,.1)', border: 'none',
              color: 'white', borderRadius: '8px', padding: '6px 14px',
              fontSize: '.8rem', cursor: 'pointer',
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '8px' }}>
          Bienvenido 👋
        </h1>
        <p style={{ color: '#7888a8', marginBottom: '32px' }}>
          {profile?.email}
        </p>

        {/* Stats placeholder */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px', marginBottom: '32px',
        }}>
          {[
            { label: 'Documentos', value: '0', icon: '📄' },
            { label: 'Clientes', value: '0', icon: '👥' },
            { label: 'Este mes', value: '$0', icon: '💰' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'white', borderRadius: '14px',
              padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0e1b3d' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '.8rem', color: '#7888a8' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{
          background: 'white', borderRadius: '14px',
          padding: '24px', boxShadow: '0 1px 3px rgba(10,30,80,.08)',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', marginBottom: '16px' }}>
            Acciones rápidas
          </h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { label: '+ Nuevo presupuesto', bg: '#1a56e8' },
              { label: '+ Nueva factura', bg: '#0a7c4b' },
              { label: '+ Nuevo cliente', bg: '#0e7490' },
            ].map(action => (
              <button key={action.label} style={{
                background: action.bg, color: 'white', border: 'none',
                borderRadius: '10px', padding: '10px 18px',
                fontSize: '.85rem', fontWeight: '600', cursor: 'pointer',
              }}>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}