'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getPublicQuote, respondPublicQuote, PublicQuote } from '@/lib/publicQuote';
import { calcTotal, unitLabel } from '@/lib/documents';
import { generatePDF } from '@/lib/pdf';

export default function PublicQuotePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [quote, setQuote]         = useState<PublicQuote | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [response, setResponse]   = useState<'accepted' | 'rejected' | null>(null);
  const [clientNote, setClientNote] = useState('');
  const [signedBy, setSignedBy]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);

  useEffect(() => {
    if (!token) return;
    getPublicQuote(token).then(q => {
      if (!q) { setNotFound(true); setLoading(false); return; }
      setQuote(q);
      setLoading(false);
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

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#7888a8' }}>Cargando presupuesto...</div>
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
            Este link no corresponde a un presupuesto válido o fue revocado. Pedile al vendedor un link nuevo.
          </p>
        </div>
      </div>
    );
  }

  if (!quote) return null;
  const d = quote.doc;
  const total = calcTotal(d);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header del vendedor */}
      <div style={{ background: '#0f2d6e', padding: '20px 24px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '1.3rem' }}>
            {quote.biz.name || 'Tu Empresa'}
          </div>
          <div style={{ color: '#93adf5', fontSize: '.82rem', marginTop: 4 }}>
            {quote.biz.address}{quote.biz.address && ' · '}{quote.biz.phone} · {quote.biz.email}
            {quote.biz.cuit && ` · CUIT: ${quote.biz.cuit}`}
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '720px', margin: '0 auto' }}>
        {/* Título */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0e1b3d', margin: 0 }}>
              Presupuesto #{d.num}
            </h1>
            <div style={{ fontSize: '.82rem', color: '#7888a8', marginTop: 4 }}>
              Emitido: {d.dateIssue}{d.dateExpiry && ` · Válido hasta: ${d.dateExpiry}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => generatePDF(d, quote.biz, true)}
              style={{ background: '#1a56e8', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}
            >
              📄 Descargar PDF
            </button>
          </div>
        </div>

        {/* Estado */}
        {quote.status !== 'pending' && (
          <div style={{
            background: quote.status === 'accepted' ? '#d1fae5' : '#fee2e2',
            color: quote.status === 'accepted' ? '#0a7c4b' : '#c41c1c',
            borderRadius: '12px', padding: '14px 18px', marginBottom: '16px',
            fontSize: '.9rem', fontWeight: 600,
          }}>
            {quote.status === 'accepted' ? '✓ Presupuesto aceptado' : '✗ Presupuesto rechazado'}
            {quote.signedBy && ` por ${quote.signedBy}`}
            {quote.signedAt && ` · ${quote.signedAt.split('T')[0]}`}
            {quote.clientNote && <div style={{ fontWeight: 400, marginTop: 6, fontSize: '.85rem' }}>«{quote.clientNote}»</div>}
          </div>
        )}

        {/* Cliente */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px' }}>
          <div style={{ fontSize: '.75rem', color: '#7888a8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Para</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0e1b3d' }}>{d.clientName}</div>
          {d.clientCompany && <div style={{ fontSize: '.85rem', color: '#364061' }}>{d.clientCompany}</div>}
          {(d.clientEmail || d.clientPhone) && (
            <div style={{ fontSize: '.82rem', color: '#7888a8', marginTop: 4 }}>
              {d.clientEmail && <span>{d.clientEmail} </span>}
              {d.clientPhone && <span>· {d.clientPhone}</span>}
            </div>
          )}
        </div>

        {/* Ítems */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0e1b3d', marginBottom: 12 }}>Detalle</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.items.map((it, i) => {
              const line = it.qty * it.price * (1 - (it.disc || 0) / 100);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f4ff', fontSize: '.88rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0e1b3d', fontWeight: 600 }}>{it.desc}</div>
                    <div style={{ color: '#7888a8', fontSize: '.78rem', marginTop: 2 }}>
                      {it.qty} {unitLabel(it.unit, it.qty) || 'unidad'} × ${fmt(it.price)}{it.disc ? ` · desc. ${it.disc}%` : ''}
                    </div>
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

        {/* Notas */}
        {d.notes && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0e1b3d', marginBottom: 8 }}>Notas y condiciones</h2>
            <div style={{ fontSize: '.85rem', color: '#364061', whiteSpace: 'pre-wrap' }}>{d.notes}</div>
          </div>
        )}

        {/* Acción del cliente */}
        {quote.status === 'pending' && !done && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', border: '2px solid #1a56e8' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0e1b3d', marginBottom: 8 }}>¿Aceptás este presupuesto?</h2>
            <p style={{ fontSize: '.85rem', color: '#7888a8', marginBottom: 16 }}>
              Tu respuesta se enviará a {quote.biz.name}. Al aceptar, confirmás los términos y precios detallados arriba.
            </p>
            <div style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#364061', marginBottom: 5 }}>Tu nombre (firma) *</label>
                <input
                  value={signedBy}
                  onChange={e => setSignedBy(e.target.value)}
                  placeholder="Nombre y apellido"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', color: '#0e1b3d' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#364061', marginBottom: 5 }}>Comentario (opcional)</label>
                <textarea
                  value={clientNote}
                  onChange={e => setClientNote(e.target.value)}
                  placeholder="Alguna observación, solicitud de cambio, etc."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', color: '#0e1b3d', resize: 'vertical' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => handleSubmit('rejected')}
                disabled={submitting}
                style={{ flex: 1, padding: '14px', borderRadius: '10px', background: submitting ? '#fecaca' : '#fee2e2', color: '#c41c1c', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                ✗ Rechazar
              </button>
              <button
                onClick={() => handleSubmit('accepted')}
                disabled={submitting}
                style={{ flex: 2, padding: '14px', borderRadius: '10px', background: submitting ? '#86efac' : '#0a7c4b', color: 'white', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting && response === 'accepted' ? 'Enviando...' : '✓ Aceptar presupuesto'}
              </button>
            </div>
          </div>
        )}

        {done && (
          <div style={{
            background: response === 'accepted' ? '#d1fae5' : '#fee2e2',
            borderRadius: '14px', padding: '32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{response === 'accepted' ? '✓' : '✗'}</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: response === 'accepted' ? '#0a7c4b' : '#c41c1c', marginBottom: 8 }}>
              {response === 'accepted' ? '¡Presupuesto aceptado!' : 'Presupuesto rechazado'}
            </h2>
            <p style={{ color: '#364061', fontSize: '.9rem' }}>
              {response === 'accepted'
                ? `Gracias ${signedBy}. Tu respuesta fue enviada a ${quote.biz.name}. Te van a contactar a la brevedad.`
                : `Tu respuesta fue enviada a ${quote.biz.name}.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
