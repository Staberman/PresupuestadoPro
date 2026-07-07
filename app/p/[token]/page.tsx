'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getPublicQuote, respondPublicQuote, PublicQuote } from '@/lib/publicQuote';
import { getPublicProposal, respondPublicProposal, PublicProposal } from '@/lib/publicProposal';
import { calcTotal, unitLabel } from '@/lib/documents';
import { generatePDF, generateProposalPDF } from '@/lib/pdf';

type Mode = 'quote' | 'proposal';

export default function PublicPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [mode, setMode]               = useState<Mode | null>(null);
  const [quote, setQuote]             = useState<PublicQuote | null>(null);
  const [proposal, setProposal]       = useState<PublicProposal | null>(null);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [response, setResponse]       = useState<string | null>(null);
  const [clientNote, setClientNote]   = useState('');
  const [signedBy, setSignedBy]       = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);

  useEffect(() => {
    if (!token) return;
    // Primero buscar en presupuestos, luego en propuestas
    getPublicQuote(token).then(q => {
      if (q) { setQuote(q); setMode('quote'); setLoading(false); return; }
      getPublicProposal(token).then(p => {
        if (p) { setProposal(p); setMode('proposal'); setLoading(false); return; }
        setNotFound(true); setLoading(false);
      });
    });
  }, [token]);

  async function handleSubmit(kind: 'accepted' | 'rejected') {
    if (!quote) return;
    if (kind === 'accepted' && !signedBy.trim()) {
      alert('Por favor ingresá tu nombre para firmar la aceptación.');
      return;
    }
    setSubmitting(true);
    setResponse(kind);
    try {
      await respondPublicQuote(token, kind, clientNote, signedBy);
      setDone(true);
    } catch {
      alert('Hubo un error al enviar tu respuesta. Intentá de nuevo.');
      setResponse(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProposalResponse(kind: 'aprobado' | 'postergado' | 'rechazado') {
    if (!proposal) return;
    if (kind !== 'rechazado' && !signedBy.trim()) {
      alert('Por favor ingresá tu nombre para firmar.');
      return;
    }
    setSubmitting(true);
    setResponse(kind);
    try {
      await respondPublicProposal(token, kind, signedBy, clientNote);
      setDone(true);
    } catch {
      alert('Hubo un error al enviar tu respuesta. Intentá de nuevo.');
      setResponse(null);
    } finally {
      setSubmitting(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#7888a8' }}>Cargando...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>😕</div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0e1b3d', marginBottom: 8 }}>Link no válido</h1>
          <p style={{ color: '#7888a8', fontSize: '.9rem' }}>
            Este link no corresponde a un documento válido o fue revocado.
          </p>
        </div>
      </div>
    );
  }

  // ====== MODO: PRESUPUESTO (existente) ======
  if (mode === 'quote' && quote) {
    const d = quote.doc;
    const total = calcTotal(d);
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ background: '#0f2d6e', padding: '20px 24px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '1.3rem' }}>{quote.biz.name || 'Tu Empresa'}</div>
            <div style={{ color: '#93adf5', fontSize: '.82rem', marginTop: 4 }}>
              {quote.biz.address}{quote.biz.address && ' · '}{quote.biz.phone} · {quote.biz.email}
              {quote.biz.cuit && ` · CUIT: ${quote.biz.cuit}`}
            </div>
          </div>
        </div>
        <div style={{ padding: '32px 24px', maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0e1b3d', margin: 0 }}>Presupuesto #{d.num}</h1>
              <div style={{ fontSize: '.82rem', color: '#7888a8', marginTop: 4 }}>Emitido: {d.dateIssue}{d.dateExpiry && ` · Válido hasta: ${d.dateExpiry}`}</div>
            </div>
            <button onClick={() => generatePDF(d, quote.biz, true)} style={{ background: '#1a56e8', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>📄 Descargar PDF</button>
          </div>
          {quote.status !== 'pending' && (
            <div style={{ background: quote.status === 'accepted' ? '#d1fae5' : '#fee2e2', color: quote.status === 'accepted' ? '#0a7c4b' : '#c41c1c', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', fontSize: '.9rem', fontWeight: 600 }}>
              {quote.status === 'accepted' ? '✓ Presupuesto aceptado' : '✗ Presupuesto rechazado'}
              {quote.signedBy && ` por ${quote.signedBy}`}
              {quote.signedAt && ` · ${quote.signedAt.split('T')[0]}`}
              {quote.clientNote && <div style={{ fontWeight: 400, marginTop: 6, fontSize: '.85rem' }}>«{quote.clientNote}»</div>}
            </div>
          )}
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px' }}>
            <div style={{ fontSize: '.75rem', color: '#7888a8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Para</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0e1b3d' }}>{d.clientName}</div>
            {d.clientCompany && <div style={{ fontSize: '.85rem', color: '#364061' }}>{d.clientCompany}</div>}
          </div>
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0e1b3d', marginBottom: 12 }}>Detalle</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.items.map((it, i) => {
                const line = it.qty * it.price * (1 - (it.disc || 0) / 100);
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f4ff', fontSize: '.88rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#0e1b3d', fontWeight: 600 }}>{it.desc}</div>
                      <div style={{ color: '#7888a8', fontSize: '.78rem', marginTop: 2 }}>{it.qty} {unitLabel(it.unit, it.qty) || 'unidad'} × ${fmt(it.price)}{it.disc ? ` · desc. ${it.disc}%` : ''}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#0e1b3d' }}>${fmt(line)}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: 'right', marginTop: 16, paddingTop: 12, borderTop: '2px solid #0f2d6e' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f2d6e' }}>${fmt(total)}</div>
            </div>
          </div>
          {d.notes && (
            <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0e1b3d', marginBottom: 8 }}>Notas y condiciones</h2>
              <div style={{ fontSize: '.85rem', color: '#364061', whiteSpace: 'pre-wrap' }}>{d.notes}</div>
            </div>
          )}
          {quote.status === 'pending' && !done && (
            <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', border: '2px solid #1a56e8' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0e1b3d', marginBottom: 16 }}>¿Aceptás este presupuesto?</h2>
              <div style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
                <input value={signedBy} onChange={e => setSignedBy(e.target.value)} placeholder="Tu nombre (firma) *" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', color: '#0e1b3d' }} />
                <textarea value={clientNote} onChange={e => setClientNote(e.target.value)} placeholder="Comentario (opcional)" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', color: '#0e1b3d', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => handleSubmit('rejected')} disabled={submitting} style={{ flex: 1, padding: '14px', borderRadius: '10px', background: '#fee2e2', color: '#c41c1c', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer' }}>✗ Rechazar</button>
                <button onClick={() => handleSubmit('accepted')} disabled={submitting} style={{ flex: 2, padding: '14px', borderRadius: '10px', background: '#0a7c4b', color: 'white', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer' }}>{submitting && response === 'accepted' ? 'Enviando...' : '✓ Aceptar'}</button>
              </div>
            </div>
          )}
          {done && (
            <div style={{ background: response === 'accepted' ? '#d1fae5' : '#fee2e2', borderRadius: '14px', padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{response === 'accepted' ? '✓' : '✗'}</div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: response === 'accepted' ? '#0a7c4b' : '#c41c1c', marginBottom: 8 }}>{response === 'accepted' ? '¡Presupuesto aceptado!' : 'Presupuesto rechazado'}</h2>
              <p style={{ color: '#364061', fontSize: '.9rem' }}>Tu respuesta fue enviada.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====== MODO: PROPUESTA (nuevo) ======
  if (mode === 'proposal' && proposal) {
    const p = proposal.proposal;
    let numberedCount = 0;
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Header */}
        <div style={{ background: '#0f2d6e', padding: '24px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h1 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{p.title || 'Propuesta'}</h1>
            <div style={{ color: '#93adf5', fontSize: '.82rem', marginTop: 6, display: 'flex', alignItems: 'center', gap: '12px' }}>
              Fecha de emisión: {p.dateIssue}
              <button onClick={() => generateProposalPDF(p, { name: p.title || 'Propuesta', address: '', phone: '', email: '', cuit: '', currency: 'ARS', footer: '' }, true)} style={{ background: '#0a7c4b', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer' }}>
                📄 PDF
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '32px 24px', maxWidth: '720px', margin: '0 auto' }}>
          {/* Monto total */}
          <div style={{ background: '#0f2d6e', borderRadius: '14px', padding: '24px', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ color: '#93adf5', fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Monto total</div>
            <div style={{ color: 'white', fontSize: '2rem', fontWeight: 800 }}>${fmt(p.totalAmount)}</div>
          </div>

          {/* Estado */}
          {proposal.status !== 'pending' && (
            <div style={{
              background: proposal.status === 'aprobado' ? '#d1fae5' : proposal.status === 'rechazado' ? '#fee2e2' : '#e0e7ff',
              color: proposal.status === 'aprobado' ? '#0a7c4b' : proposal.status === 'rechazado' ? '#c41c1c' : '#1a56e8',
              borderRadius: '12px', padding: '16px', marginBottom: '20px', fontWeight: 600,
            }}>
              {proposal.status === 'aprobado' ? '✓ Propuesta aprobada' : proposal.status === 'rechazado' ? '✗ Propuesta rechazada' : '⏳ Propuesta postergada'}
              {proposal.postergarUntil && ` hasta el ${proposal.postergarUntil}`}
              {proposal.signedBy && ` por ${proposal.signedBy}`}
              {proposal.signedAt && ` · ${proposal.signedAt.split('T')[0]}`}
              {proposal.clientNote && <div style={{ fontWeight: 400, marginTop: 6, fontSize: '.88rem' }}>«{proposal.clientNote}»</div>}
            </div>
          )}

          {/* Secciones */}
          {p.sections.map(s => {
            if (!s.isInfo) numberedCount++;
            return (
              <div key={s.id} style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0e1b3d', marginBottom: '10px' }}>
                  {s.isInfo ? '' : `${numberedCount}. `}{s.title}
                </h2>
                {s.description && (
                  <div style={{ fontSize: '.9rem', color: '#364061', lineHeight: 1.7, marginBottom: s.bullets.length ? '14px' : 0, whiteSpace: 'pre-wrap' }}>
                    {s.description}
                  </div>
                )}
                {s.bullets.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#364061', fontSize: '.88rem', lineHeight: 1.8 }}>
                    {s.bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                )}
              </div>
            );
          })}

          {/* Acciones del cliente */}
          {proposal.status === 'pending' && !done && (
            <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', border: '2px solid #1a56e8', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0e1b3d', marginBottom: 16 }}>Tu respuesta</h2>
              <div style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
                <input value={signedBy} onChange={e => setSignedBy(e.target.value)} placeholder="Tu nombre (firma) *" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', color: '#0e1b3d' }} />
                <textarea value={clientNote} onChange={e => setClientNote(e.target.value)} placeholder="Comentario (opcional)" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', color: '#0e1b3d', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => handleProposalResponse('rechazado')} disabled={submitting} style={{ flex: 1, minWidth: '120px', padding: '14px', borderRadius: '10px', background: '#fee2e2', color: '#c41c1c', border: 'none', fontWeight: 700, fontSize: '.95rem', cursor: submitting ? 'not-allowed' : 'pointer' }}>✗ Rechazar</button>
                <button onClick={() => handleProposalResponse('postergado')} disabled={submitting} style={{ flex: 1, minWidth: '120px', padding: '14px', borderRadius: '10px', background: '#e0e7ff', color: '#1a56e8', border: 'none', fontWeight: 700, fontSize: '.95rem', cursor: submitting ? 'not-allowed' : 'pointer' }}>⏳ Postergar 30 días</button>
                <button onClick={() => handleProposalResponse('aprobado')} disabled={submitting} style={{ flex: 1, minWidth: '120px', padding: '14px', borderRadius: '10px', background: '#0a7c4b', color: 'white', border: 'none', fontWeight: 700, fontSize: '.95rem', cursor: submitting ? 'not-allowed' : 'pointer' }}>{submitting && response === 'aprobado' ? 'Enviando...' : '✓ Aprobar'}</button>
              </div>
            </div>
          )}

          {done && (
            <div style={{
              background: response === 'aprobado' ? '#d1fae5' : response === 'rechazado' ? '#fee2e2' : '#e0e7ff',
              borderRadius: '14px', padding: '32px', textAlign: 'center', marginBottom: '16px',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{response === 'aprobado' ? '✓' : response === 'rechazado' ? '✗' : '⏳'}</div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: response === 'aprobado' ? '#0a7c4b' : response === 'rechazado' ? '#c41c1c' : '#1a56e8', marginBottom: 8 }}>
                {response === 'aprobado' ? '¡Propuesta aprobada!' : response === 'rechazado' ? 'Propuesta rechazada' : 'Propuesta postergada 30 días'}
              </h2>
              <p style={{ color: '#364061', fontSize: '.9rem' }}>Tu respuesta fue enviada.</p>
            </div>
          )}

          {/* Footer: fecha + WhatsApp */}
          <div style={{ textAlign: 'center', padding: '20px', fontSize: '.8rem', color: '#7888a8' }}>
            <div style={{ marginBottom: 12 }}>Esta propuesta fue generada el {p.dateIssue}</div>
            {proposal.whatsappPhone && (
              <a
                href={`https://wa.me/${proposal.whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, tengo una consulta sobre la propuesta.')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block', background: '#d1fae5', color: '#0a7c4b',
                  borderRadius: '10px', padding: '10px 20px', fontSize: '.85rem',
                  fontWeight: 600, textDecoration: 'none',
                }}
              >
                💬 Contactar por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
