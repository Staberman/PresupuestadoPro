'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  getProposals, deleteProposal, updateProposal,
  Proposal, ProposalStatus, PROPOSAL_STATUS_META, PROPOSAL_STATUSES,
} from '@/lib/proposals';
import { generateProposalPDF, BizPdf } from '@/lib/pdf';

export default function ProposalsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [proposals, setProposals]       = useState<Proposal[]>([]);
  const [dataLoading, setDataLoading]   = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProposalStatus>('all');
  const [biz, setBiz]                   = useState<BizPdf>({ name: '', address: '', phone: '', email: '', cuit: '', currency: 'ARS', footer: '' });

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getProposals(user.uid).then(data => {
      setProposals(data);
      setDataLoading(false);
    });
    import('firebase/firestore').then(({ doc, getDoc }) => {
      import('@/lib/firebase').then(({ db }) => {
        getDoc(doc(db, 'users', user.uid)).then(snap => {
          if (snap.exists() && snap.data().biz) {
            setBiz(b => ({ ...b, ...(snap.data().biz as Partial<BizPdf>) }));
          }
        });
      });
    });
  }, [user]);

  async function handleDelete(id: string) {
    if (!user || !confirm('¿Eliminar esta propuesta?')) return;
    await deleteProposal(user.uid, id);
    setProposals(proposals.filter(p => p.id !== id));
  }

  async function handleStatusChange(id: string, status: ProposalStatus) {
    if (!user) return;
    setProposals(proposals.map(p => p.id === id ? { ...p, status } : p));
    await updateProposal(user.uid, id, { status });
  }

  const filtered = proposals.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) &&
        !(p.clientName ?? '').toLowerCase().includes(search.toLowerCase()) &&
        !p.num.includes(search)) return false;
    return true;
  });

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  if (loading || dataLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#7888a8' }}>Cargando propuestas...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: '#0f2d6e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem' }}>
          Presupuesto<span style={{ color: '#6389f0' }}>Pro</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', cursor: 'pointer' }}>
            ← Dashboard
          </button>
          <button onClick={() => router.push('/dashboard/proposals/new')} style={{ background: '#1a56e8', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', fontWeight: '600', cursor: 'pointer' }}>
            + Nueva propuesta
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '8px' }}>
          Propuestas ({proposals.length})
        </h1>
        <p style={{ color: '#7888a8', marginBottom: '20px', fontSize: '.88rem' }}>
          Propuestas narrativas para campañas y servicios de marketing.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente o número..."
            style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none' }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | ProposalStatus)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #dde3f5', fontSize: '.85rem', color: '#0e1b3d', background: 'white' }}>
            <option value="all">Todos los estados</option>
            {PROPOSAL_STATUSES.map(s => <option key={s} value={s}>{PROPOSAL_STATUS_META[s].label}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', padding: '48px', textAlign: 'center', color: '#7888a8' }}>
            {proposals.length === 0 ? 'Todavía no creaste ninguna propuesta. Creá tu primera propuesta de marketing.' : 'No hay propuestas con ese filtro.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(p => {
              const meta = PROPOSAL_STATUS_META[p.status];
              const numberedSections = p.sections.filter(s => !s.isInfo).length;
              return (
                <div key={p.id} style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => router.push(`/dashboard/proposals/${p.id}`)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '.72rem', fontWeight: '700', color: '#7888a8', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          PR #{p.num}
                        </span>
                        <span style={{ background: meta.bg, color: meta.color, borderRadius: '20px', padding: '3px 10px', fontSize: '.72rem', fontWeight: 600 }}>
                          {meta.label}
                        </span>
                        {p.status === 'postergado' && p.postergarUntil && (
                          <span style={{ fontSize: '.68rem', color: '#1a56e8', background: '#e0e7ff', borderRadius: '20px', padding: '2px 8px' }}>
                            hasta {p.postergarUntil}
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: '700', color: '#0e1b3d', marginBottom: '4px', fontSize: '1.02rem' }}>
                        {p.title || 'Sin título'}
                      </div>
                      <div style={{ fontSize: '.82rem', color: '#7888a8' }}>
                        {p.clientName || 'Sin cliente'} · {p.dateIssue} · {numberedSections} sección(es)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0e1b3d' }}>
                        ${fmt(p.totalAmount)}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <select
                          value={p.status}
                          onChange={e => handleStatusChange(p.id!, e.target.value as ProposalStatus)}
                          style={{
                            padding: '4px 8px', borderRadius: '6px',
                            border: '1px solid ' + (meta.color + '55'),
                            background: meta.bg, color: meta.color,
                            fontSize: '.72rem', fontWeight: 600, cursor: 'pointer', outline: 'none',
                          }}
                        >
                          {PROPOSAL_STATUSES.map(s => (
                            <option key={s} value={s} style={{ color: '#0e1b3d', background: 'white' }}>
                              {PROPOSAL_STATUS_META[s].label}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => router.push(`/dashboard/proposals/${p.id}`)} style={{ background: '#f0f4ff', color: '#1a56e8', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                          Ver
                        </button>
                        <button onClick={() => router.push(`/dashboard/proposals/${p.id}/edit`)} style={{ background: '#f0f4ff', color: '#364061', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                          Editar
                        </button>
                        <button onClick={() => generateProposalPDF(p, biz, true)} style={{ background: '#d1fae5', color: '#0a7c4b', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                          PDF
                        </button>
                        <button onClick={() => handleDelete(p.id!)} style={{ background: '#fee2e2', color: '#c41c1c', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
