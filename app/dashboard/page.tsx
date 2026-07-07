'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDocuments, calcTotal, Document } from '@/lib/documents';
import { getClients, Client } from '@/lib/clients';
import { normalizeStatus } from '@/lib/status';
import { getPayments, computeMonthlyIncome, Payment, MonthlyIncome } from '@/lib/payments';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [docs, setDocs]           = useState<Document[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [monthly, setMonthly]     = useState<MonthlyIncome[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDocuments(user.uid),
      getClients(user.uid),
    ]).then(async ([d, c]) => {
      setDocs(d);
      setClients(c);
      const paymentsByDoc: Record<string, Payment[]> = {};
      const invoices = d.filter(doc => doc.type === 'factura' && doc.id);
      await Promise.all(
        invoices.map(async doc => {
          paymentsByDoc[doc.id!] = await getPayments(user.uid, doc.id!);
        })
      );
      setMonthly(computeMonthlyIncome(d, paymentsByDoc));
      setStatsLoading(false);
    });
  }, [user]);

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

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const emittedThisMonth = docs
    .filter(d => (d.dateIssue || '').startsWith(monthKey))
    .reduce((a, d) => a + calcTotal(d), 0);
  const pendingToCollect = docs
    .filter(d => d.type === 'factura' && ['enviado', 'aceptado'].includes(normalizeStatus(d.status)))
    .reduce((a, d) => a + calcTotal(d), 0);

  const stats = [
    { label: 'Documentos', value: statsLoading ? '—' : String(docs.length), icon: '📄', href: '/dashboard/documents' },
    { label: 'Clientes', value: statsLoading ? '—' : String(clients.length), icon: '👥', href: '/dashboard/clients' },
    { label: 'Emitido este mes', value: statsLoading ? '—' : `$${emittedThisMonth.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, icon: '💰', href: '/dashboard/documents' },
    { label: 'Por cobrar', value: statsLoading ? '—' : `$${pendingToCollect.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, icon: '⏳', href: '/dashboard/documents' },
  ];

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
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '8px' }}>
          Bienvenido 👋
        </h1>
        <p style={{ color: '#7888a8', marginBottom: '32px' }}>
          {user?.uid ? `Usuario interno` : ''}
        </p>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px', marginBottom: '32px',
        }}>
          {stats.map(stat => (
            <div
              key={stat.label}
              onClick={() => router.push(stat.href)}
              style={{
                background: 'white', borderRadius: '14px',
                padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0e1b3d', lineHeight: 1.2 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '.8rem', color: '#7888a8', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Panel de ingresos mensual */}
        <div style={{
          background: 'white', borderRadius: '14px',
          padding: '24px', boxShadow: '0 1px 3px rgba(10,30,80,.08)',
          marginBottom: '32px',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', marginBottom: '16px' }}>
            Ingresos por mes
          </h2>
          {statsLoading ? (
            <div style={{ color: '#7888a8', fontSize: '.85rem' }}>Cargando...</div>
          ) : monthly.length === 0 ? (
            <div style={{ color: '#7888a8', fontSize: '.85rem', textAlign: 'center', padding: '24px' }}>
              Todavía no emitiste facturas. Cuando lo hagas, acá vas a ver tu facturación y cobranza por mes.
            </div>
          ) : (
            <IncomeChart data={monthly.slice(-6)} />
          )}
        </div>

        {/* Config shortcut */}
        <div
          onClick={() => router.push('/dashboard/settings')}
          style={{
            background: '#364061', borderRadius: '14px',
            padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)',
            cursor: 'pointer', marginBottom: '32px', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>⚙️ Configuración del negocio</div>
            <div style={{ fontSize: '.8rem', color: '#9aa6c4', marginTop: 4 }}>
              Datos que aparecen en tus PDFs
            </div>
          </div>
          <div style={{ fontSize: '1.2rem' }}>→</div>
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
              { label: '+ Nuevo presupuesto', bg: '#1a56e8', href: '/dashboard/documents/new' },
              { label: '+ Nueva factura', bg: '#0a7c4b', href: '/dashboard/documents/new' },
              { label: '+ Nuevo cliente', bg: '#0e7490', href: '/dashboard/clients' },
              { label: '📋 Nueva propuesta', bg: '#b91c1c', href: '/dashboard/proposals/new' },
              { label: '📁 Proyectos', bg: '#6d28d9', href: '/dashboard/projects' },
              { label: '🛠️ Catálogo de servicios', bg: '#7c2d12', href: '/dashboard/services' },
            ].map(action => (
              <button key={action.label} onClick={() => router.push(action.href)} style={{
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

function IncomeChart({ data }: { data: MonthlyIncome[] }) {
  const fmt = (n: number) => '$' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const max = Math.max(1, ...data.map(d => Math.max(d.facturado, d.cobrado)));

  return (
    <div>
      {/* Leyenda */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '.78rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#0f2d6e', borderRadius: '3px' }} />
          <span style={{ color: '#364061' }}>Facturado</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#0a7c4b', borderRadius: '3px' }} />
          <span style={{ color: '#364061' }}>Cobrado</span>
        </div>
      </div>

      {/* Barras */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '160px', paddingTop: '12px' }}>
        {data.map(m => (
          <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '120px', width: '100%', justifyContent: 'center' }}>
              <div
                title={`Facturado: ${fmt(m.facturado)}`}
                style={{
                  width: '14px',
                  height: `${Math.max(2, (m.facturado / max) * 120)}px`,
                  background: '#0f2d6e', borderRadius: '4px 4px 0 0',
                  transition: 'height .3s',
                }}
              />
              <div
                title={`Cobrado: ${fmt(m.cobrado)}`}
                style={{
                  width: '14px',
                  height: `${Math.max(2, (m.cobrado / max) * 120)}px`,
                  background: '#0a7c4b', borderRadius: '4px 4px 0 0',
                  transition: 'height .3s',
                }}
              />
            </div>
            <div style={{ fontSize: '.7rem', color: '#7888a8', textAlign: 'center' }}>{m.label}</div>
            <div style={{ fontSize: '.68rem', color: '#0e1b3d', fontWeight: 600 }}>{fmt(m.facturado)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
