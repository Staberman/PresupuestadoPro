'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  getProposal, updateProposal, Proposal, ProposalStatus, PROPOSAL_STATUS_META, PROPOSAL_STATUSES,
} from '@/lib/proposals';
import { ensureBuiltinTemplate } from '@/lib/templates';

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [proposalId, setProposalId]   = useState<string | null>(null);
  const [proposal, setProposal]       = useState<Proposal | null>(null);
  const [notFound, setNotFound]       = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);
  const [copied, setCopied]           = useState(false);
  const [publicUrl, setPublicUrl]     = useState<string | null>(null);

  useEffect(() => { params.then(p => setProposalId(p.id)); }, [params]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user && proposalId) {
      getProposal(user.uid, proposalId).then(p => {
        if (!p) { setNotFound(true); return; }
        setProposal(p);
        setWhatsappPhone(p.whatsappPhone ?? '');
      });
      ensureBuiltinTemplate(user.uid).catch(() => {});
    }
  }, [user, proposalId]);

  async function handleStatusChange(status: ProposalStatus) {
    if (!user || !proposalId || !proposal) return;
    const update: Partial<Proposal> = { status };
    if (status === 'postergado') {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      update.postergarUntil = d.toISOString().split('T')[0];
    }
    setProposal({ ...proposal, ...update });
    await updateProposal(user.uid, proposalId, update);
  }

  async function handleShareLink() {
    if (!user || !proposalId || !proposal) return;
    setSending(true);
    try {
      const { publishProposal } = await import('@/lib/publicProposal');
      const token = await publishProposal(user.uid, { ...proposal, id: proposalId }, whatsappPhone);
      const url = `${window.location.origin}/p/${token}`;
      setPublicUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      // Marcar como enviado
      if (proposal.status === 'borrador') {
        await updateProposal(user.uid, proposalId, { status: 'enviado' });
        setProposal({ ...proposal, status: 'enviado' });
      }
    } catch {
      alert('No se pudo generar el link. Intentá de nuevo.');
    } finally {
      setSending(false);
    }
  }

  async function handleSendByEmail() {
    if (!user || !proposalId || !proposal) return;
    if (!proposal.clientEmail?.trim()) { alert('Esta propuesta no tiene email del cliente.'); return; }
    setSending(true);
    try {
      const { publishProposal } = await import('@/lib/publicProposal');
      const token = await publishProposal(user.uid, { ...proposal, id: proposalId }, whatsappPhone);
      const url = `${window.location.origin}/p/${token}`;
      setPublicUrl(url);
      // Marcar como enviado
      if (proposal.status === 'borrador') {
        await updateProposal(user.uid, proposalId, { status: 'enviado' });
        setProposal({ ...proposal, status: 'enviado' });
      }
      const res = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: proposal.clientEmail,
          clientName: proposal.clientName,
          proposalTitle: proposal.title,
          proposalNum: proposal.num,
          publicUrl: url,
          whatsappPhone,
        }),
      });
      if (!res.ok) throw new Error('Error al enviar');
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch {
      alert('No se pudo enviar el email. Verificá RESEND_API_KEY y el email del cliente.');
    } finally {
      setSending(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  if (loading || !proposalId) return null;

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#0e1b3d', fontWeight: 700, marginBottom: 12 }}>Propuesta no encontrada</div>
          <button onClick={() => router.push('/dashboard/proposals')} style={{ background: '#1a56e8', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>
            ← Volver a propuestas
          </button>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#7888a8' }}>Cargando...</div>
      </div>
    );
  }

  const meta = PROPOSAL_STATUS_META[proposal.status];
  let numberedCount = 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: '#0f2d6e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem' }}>
          Presupuesto<span style={{ color: '#6389f0' }}>Pro</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/dashboard/proposals')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', cursor: 'pointer' }}>
            ← Volver
          </button>
          <button onClick={handleSendByEmail} disabled={sending} style={{ background: sent ? '#0a7c4b' : '#0e7490', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', fontWeight: '600', cursor: sending ? 'not-allowed' : 'pointer' }}>
            {sent ? '✓ Enviado' : '📧 Enviar al cliente'}
          </button>
          <button onClick={handleShareLink} disabled={sending} style={{ background: copied ? '#0a7c4b' : '#364061', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', fontWeight: '600', cursor: sending ? 'not-allowed' : 'pointer' }}>
            {copied ? '✓ Copiado' : '🔗 Copiar link'}
          </button>
          <button onClick={() => router.push(`/dashboard/proposals/${proposalId}/edit`)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', cursor: 'pointer' }}>
            ✏️ Editar
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '760px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0e1b3d', margin: 0 }}>
            {proposal.title || 'Sin título'}
          </h1>
          <span style={{ background: meta.bg, color: meta.color, borderRadius: '20px', padding: '4px 12px', fontSize: '.75rem', fontWeight: 600 }}>
            {meta.label}
          </span>
          {proposal.status === 'postergado' && proposal.postergarUntil && (
            <span style={{ fontSize: '.72rem', color: '#1a56e8', background: '#e0e7ff', borderRadius: '20px', padding: '3px 10px' }}>
              hasta {proposal.postergarUntil}
            </span>
          )}
        </div>

        {/* Link público */}
        {publicUrl && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px', borderLeft: '3px solid #0e7490' }}>
            <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#0e7490', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Link público</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input readOnly value={publicUrl} onFocus={e => e.target.select()} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #dde3f5', fontSize: '.8rem', color: '#364061', background: '#f5f7fc' }} />
              <button onClick={() => { navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ background: '#0e7490', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' }}>
                {copied ? '✓' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {/* Respuesta del cliente */}
        {proposal.signedBy && (
          <div style={{ background: proposal.status === 'aprobado' ? '#d1fae5' : proposal.status === 'rechazado' ? '#fee2e2' : '#e0e7ff', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, color: meta.color, fontSize: '.9rem' }}>
              {meta.label} por <strong>{proposal.signedBy}</strong>
              {proposal.signedAt && <span style={{ fontWeight: 400 }}> · {proposal.signedAt.split('T')[0]}</span>}
            </div>
            {proposal.clientNote && <div style={{ fontSize: '.85rem', color: '#364061', marginTop: 6, fontStyle: 'italic' }}>«{proposal.clientNote}»</div>}
          </div>
        )}

        {/* Resumen */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '.75rem', color: '#7888a8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Cliente</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0e1b3d' }}>{proposal.clientName}</div>
              {proposal.clientCompany && <div style={{ fontSize: '.82rem', color: '#364061' }}>{proposal.clientCompany}</div>}
              <div style={{ fontSize: '.82rem', color: '#7888a8', marginTop: 4 }}>
                {proposal.clientEmail && <div>📧 {proposal.clientEmail}</div>}
                {proposal.clientPhone && <div>📱 {proposal.clientPhone}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '.75rem', color: '#7888a8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Monto total</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f2d6e' }}>${fmt(proposal.totalAmount)}</div>
              <div style={{ fontSize: '.75rem', color: '#7888a8', marginTop: 4 }}>Emitido: {proposal.dateIssue}</div>
            </div>
          </div>
        </div>

        {/* Secciones (preview) */}
        {proposal.sections.map(s => {
          if (!s.isInfo) numberedCount++;
          return (
            <div key={s.id} style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0e1b3d', marginBottom: '10px' }}>
                {s.isInfo ? '' : `${numberedCount}. `}{s.title}
              </h2>
              {s.description && (
                <div style={{ fontSize: '.88rem', color: '#364061', lineHeight: 1.6, marginBottom: s.bullets.length ? '14px' : 0, whiteSpace: 'pre-wrap' }}>
                  {s.description}
                </div>
              )}
              {s.bullets.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#364061', fontSize: '.85rem', lineHeight: 1.7 }}>
                  {s.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              )}
            </div>
          );
        })}

        {/* Cambiar estado */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.82rem', color: '#7888a8' }}>Cambiar estado:</span>
            {PROPOSAL_STATUSES.map(st => {
              const m = PROPOSAL_STATUS_META[st];
              const active = proposal.status === st;
              return (
                <button key={st} onClick={() => handleStatusChange(st)} style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer',
                  border: '1.5px solid ' + (active ? m.color : '#dde3f5'),
                  background: active ? m.bg : 'white', color: active ? m.color : '#364061',
                }}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
