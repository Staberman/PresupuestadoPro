'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDocuments, deleteDocument, convertToInvoice, calcTotal, Document } from '@/lib/documents';
import { generatePDF } from '@/lib/pdf';

export default function DocumentsPage() {
  const { user, profile, loading, isPro } = useAuth();
  const router = useRouter();

  const [docs, setDocs]               = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [filter, setFilter]           = useState<'all' | 'presupuesto' | 'factura'>('all');
  const [search, setSearch]           = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getDocuments(user.uid).then(data => {
        setDocs(data);
        setDocsLoading(false);
      });
    }
  }, [user]);

  const filtered = docs.filter(d => {
    if (filter !== 'all' && d.type !== filter) return false;
    if (search && !d.clientName.toLowerCase().includes(search.toLowerCase()) &&
        !d.num.includes(search)) return false;
    return true;
  });

  async function handleDelete(id: string) {
    if (!user || !confirm('¿Eliminar este documento?')) return;
    await deleteDocument(user.uid, id);
    setDocs(docs.filter(d => d.id !== id));
  }

  async function handleConvert(id: string) {
    if (!user) return;
    const nextNum = `F-${Date.now()}`;
    await convertToInvoice(user.uid, id, nextNum);
    const updated = await getDocuments(user.uid);
    setDocs(updated);
    alert('✓ Factura creada correctamente');
  }

  function statusChip(status: string) {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      draft:    { label: 'Borrador',  color: '#7888a8', bg: '#f0f4ff' },
      pending:  { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
      accepted: { label: 'Aprobado',  color: '#0a7c4b', bg: '#d1fae5' },
      rejected: { label: 'Rechazado', color: '#c41c1c', bg: '#fee2e2' },
      expired:  { label: 'Vencido',   color: '#c41c1c', bg: '#fee2e2' },
      paid:     { label: 'Cobrado',   color: '#0a7c4b', bg: '#d1fae5' },
    };
    const s = map[status] || map.pending;
    return (
      <span style={{
        background: s.bg, color: s.color,
        borderRadius: '20px', padding: '3px 10px',
        fontSize: '.72rem', fontWeight: '600',
      }}>
        {s.label}
      </span>
    );
  }

  const [biz, setBiz] = useState({ name: '', address: '', phone: '', email: '', cuit: '' });

useEffect(() => {
  if (!user) return;
  import('firebase/firestore').then(({ doc, getDoc }) => {
    import('@/lib/firebase').then(({ db }) => {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists() && snap.data().biz) {
          setBiz(snap.data().biz);
        }
      });
    });
  });
}, [user]);
  if (loading || docsLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#7888a8' }}>Cargando documentos...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#0f2d6e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem' }}>
          Presupuesto<span style={{ color: '#6389f0' }}>Pro</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', cursor: 'pointer' }}>
            ← Dashboard
          </button>
          <button onClick={() => router.push('/dashboard/documents/new')} style={{ background: '#1a56e8', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', fontWeight: '600', cursor: 'pointer' }}>
            + Nuevo documento
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '24px' }}>
          Documentos
        </h1>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente o número..."
            style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none' }}
          />
          {(['all', 'presupuesto', 'factura'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '10px 16px', borderRadius: '10px', fontSize: '.82rem', fontWeight: '600', cursor: 'pointer',
              background: filter === f ? '#0f2d6e' : 'white',
              color: filter === f ? 'white' : '#364061',
              border: '1.5px solid ' + (filter === f ? '#0f2d6e' : '#dde3f5'),
            }}>
              {f === 'all' ? 'Todos' : f === 'presupuesto' ? 'Presupuestos' : 'Facturas'}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', padding: '48px', textAlign: 'center', color: '#7888a8' }}>
            {docs.length === 0 ? 'Todavía no creaste ningún documento.' : 'No hay documentos con ese filtro.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(d => (
              <div key={d.id} style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '.72rem', fontWeight: '700', color: '#7888a8', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        {d.type} #{d.num}
                      </span>
                      {statusChip(d.status)}
                      {d.fromDocId && (
                        <span style={{ fontSize: '.68rem', color: '#0e7490', background: '#cffafe', borderRadius: '20px', padding: '2px 8px' }}>
                          desde presupuesto
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: '700', color: '#0e1b3d', marginBottom: '4px' }}>
                      {d.clientName || 'Sin nombre'}
                    </div>
                    <div style={{ fontSize: '.82rem', color: '#7888a8' }}>
                      {d.dateIssue} · {d.items.length} ítem{d.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0e1b3d' }}>
                      ${calcTotal(d).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                      {d.type === 'presupuesto' && d.status !== 'accepted' && (
                        <button onClick={() => handleConvert(d.id!)} style={{ background: '#0a7c4b', color: 'white', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                          → Factura
                        </button>
                      )}
                      
                      <button
  onClick={() => generatePDF(d, biz, isPro)}
  style={{ background: '#f0f4ff', color: '#0f2d6e', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}
>
  📄 PDF
</button><button onClick={() => router.push(`/dashboard/documents/${d.id}/edit`)} style={{ background: '#f0f4ff', color: '#1a56e8', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                        Editar
                      </button>
                      <button onClick={() => handleDelete(d.id!)} style={{ background: '#fee2e2', color: '#c41c1c', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}