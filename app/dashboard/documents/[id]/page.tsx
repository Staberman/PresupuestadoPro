'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDocument, calcTotal, Document } from '@/lib/documents';
import { getPayments, addPayment, deletePayment, Payment, PAYMENT_METHODS, totalPaid } from '@/lib/payments';
import { generatePDF, BizPdf } from '@/lib/pdf';
import { statusMeta } from '@/lib/status';

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading, isPro } = useAuth();
  const router = useRouter();
  const [docId, setDocId]         = useState<string | null>(null);
  const [doc, setDoc]             = useState<Document | null>(null);
  const [payments, setPayments]   = useState<Payment[]>([]);
  const [biz, setBiz]             = useState<BizPdf>({ name: '', address: '', phone: '', email: '', cuit: '', currency: 'ARS', footer: '' });
  const [notFound, setNotFound]   = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate]     = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('Transferencia');
  const [payNote, setPayNote]     = useState('');
  const [savingPay, setSavingPay] = useState(false);

  useEffect(() => { params.then(p => setDocId(p.id)); }, [params]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user && docId) {
      getDocument(user.uid, docId).then(d => {
        if (!d) { setNotFound(true); return; }
        setDoc(d);
        if (d.type === 'factura') {
          getPayments(user.uid, docId).then(setPayments);
        }
      });
    }
  }, [user, docId]);

  useEffect(() => {
    if (!user) return;
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

  async function handleAddPayment() {
    if (!user || !docId) return;
    if (payAmount <= 0) return;
    setSavingPay(true);
    try {
      const id = await addPayment(user.uid, docId, { amount: payAmount, date: payDate, method: payMethod, note: payNote });
      setPayments([{ id, amount: payAmount, date: payDate, method: payMethod, note: payNote }, ...payments]);
      setShowPayModal(false);
      setPayAmount(0); setPayNote('');
    } finally {
      setSavingPay(false);
    }
  }

  async function handleDeletePayment(pid: string) {
    if (!user || !docId || !confirm('¿Eliminar este pago?')) return;
    await deletePayment(user.uid, docId, pid);
    setPayments(payments.filter(p => p.id !== pid));
  }

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  if (loading || !docId) return null;

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#0e1b3d', fontWeight: 700, marginBottom: 12 }}>Documento no encontrado</div>
          <button onClick={() => router.push('/dashboard/documents')} style={{ background: '#1a56e8', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>
            ← Volver a documentos
          </button>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#7888a8' }}>Cargando...</div>
      </div>
    );
  }

  const total = calcTotal(doc);
  const paid = totalPaid(payments);
  const balance = total - paid;
  const s = statusMeta(doc.status);
  const isInvoice = doc.type === 'factura';

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', color: '#0e1b3d',
  };
  const lbl = {
    display: 'block' as const, fontSize: '.78rem',
    fontWeight: '600' as const, color: '#364061', marginBottom: '5px',
  };
  const card = {
    background: 'white', borderRadius: '14px',
    padding: '24px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: '#0f2d6e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem' }}>
          Presupuesto<span style={{ color: '#6389f0' }}>Pro</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard/documents')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', cursor: 'pointer' }}>
            ← Volver
          </button>
          <button onClick={() => generatePDF(doc, biz, isPro)} style={{ background: '#1a56e8', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', fontWeight: '600', cursor: 'pointer' }}>
            📄 Descargar PDF
          </button>
          <button onClick={() => router.push(`/dashboard/documents/${docId}/edit`)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', cursor: 'pointer' }}>
            ✏️ Editar
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '720px', margin: '0 auto' }}>
        {/* Header del doc */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0e1b3d', margin: 0 }}>
            {doc.type === 'presupuesto' ? '📄 Presupuesto' : '🧾 Factura'} #{doc.num}
          </h1>
          <span style={{ background: s.bg, color: s.color, borderRadius: '20px', padding: '4px 12px', fontSize: '.75rem', fontWeight: 600 }}>
            {s.label}
          </span>
        </div>

        {/* Cliente */}
        <div style={card}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', marginBottom: '12px' }}>Cliente</h2>
          <div style={{ fontSize: '.9rem', color: '#0e1b3d', fontWeight: 600 }}>{doc.clientName || '—'}</div>
          {doc.clientCompany && <div style={{ fontSize: '.82rem', color: '#364061' }}>{doc.clientCompany}</div>}
          <div style={{ fontSize: '.82rem', color: '#7888a8', marginTop: 6 }}>
            {doc.clientEmail && <div>📧 {doc.clientEmail}</div>}
            {doc.clientPhone && <div>📱 {doc.clientPhone}</div>}
            {doc.clientAddr && <div>📍 {doc.clientAddr}</div>}
            {doc.clientCuit && <div>CUIT/CUIL: {doc.clientCuit}</div>}
            {doc.clientFiscalCondition && <div>Condición fiscal: {doc.clientFiscalCondition}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', fontSize: '.82rem' }}>
            <div><span style={{ color: '#7888a8' }}>Emisión:</span> <strong>{doc.dateIssue || '—'}</strong></div>
            <div><span style={{ color: '#7888a8' }}>Vencimiento:</span> <strong>{doc.dateExpiry || '—'}</strong></div>
          </div>
        </div>

        {/* Ítems */}
        <div style={card}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', marginBottom: '12px' }}>Ítems</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {doc.items.map((it, i) => {
              const line = it.qty * it.price * (1 - (it.disc || 0) / 100);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f4ff', fontSize: '.85rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0e1b3d', fontWeight: 600 }}>{it.desc}</div>
                    <div style={{ color: '#7888a8', fontSize: '.78rem', marginTop: 2 }}>
                      {it.qty} {it.unit || 'unidad'} × ${fmt(it.price)}{it.disc ? ` · desc. ${it.disc}%` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#0e1b3d' }}>${fmt(line)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            <div style={{ fontSize: '.82rem', color: '#7888a8' }}>Subtotal: ${fmt(doc.items.reduce((a, it) => a + it.qty * it.price * (1 - (it.disc || 0) / 100), 0))}</div>
            {doc.discount > 0 && <div style={{ fontSize: '.78rem', color: '#7888a8' }}>Desc. global: -${fmt(total * doc.discount / 100 / (1 + doc.ivaRate / 100))}</div>}
            {doc.ivaRate > 0 && <div style={{ fontSize: '.78rem', color: '#7888a8' }}>IVA ({doc.ivaRate}%): ${fmt(total - total / (1 + doc.ivaRate / 100))}</div>}
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f2d6e', marginTop: 4 }}>Total: ${fmt(total)}</div>
          </div>
        </div>

        {/* Pagos (solo facturas) */}
        {isInvoice && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', margin: 0 }}>Pagos registrados</h2>
              <button onClick={() => setShowPayModal(true)} style={{ background: '#0a7c4b', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' }}>
                + Registrar pago
              </button>
            </div>

            {/* Resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#f0f4ff', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '.72rem', color: '#7888a8' }}>Total</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0e1b3d' }}>${fmt(total)}</div>
              </div>
              <div style={{ background: '#d1fae5', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '.72rem', color: '#0a7c4b' }}>Cobrado</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0a7c4b' }}>${fmt(paid)}</div>
              </div>
              <div style={{ background: balance > 0 ? '#fef3c7' : '#d1fae5', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '.72rem', color: balance > 0 ? '#b45309' : '#0a7c4b' }}>Saldo</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: balance > 0 ? '#b45309' : '#0a7c4b' }}>${fmt(balance)}</div>
              </div>
            </div>

            {/* Barra de progreso */}
            {total > 0 && (
              <div style={{ height: '8px', background: '#f0f4ff', borderRadius: '4px', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (paid / total) * 100)}%`, background: '#0a7c4b', transition: 'width .3s' }} />
              </div>
            )}

            {/* Lista de pagos */}
            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#7888a8', fontSize: '.85rem', padding: '16px' }}>
                Todavía no registraste pagos para esta factura.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payments.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f5f7fc', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0a7c4b' }}>${fmt(p.amount)}</div>
                      <div style={{ fontSize: '.75rem', color: '#7888a8' }}>{p.date} · {p.method}{p.note ? ` · ${p.note}` : ''}</div>
                    </div>
                    <button onClick={() => handleDeletePayment(p.id!)} style={{ background: '#fee2e2', color: '#c41c1c', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '.72rem', cursor: 'pointer' }}>
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notas */}
        {doc.notes && (
          <div style={card}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', marginBottom: '8px' }}>Notas y condiciones</h2>
            <div style={{ fontSize: '.85rem', color: '#364061', whiteSpace: 'pre-wrap' }}>{doc.notes}</div>
          </div>
        )}
      </div>

      {/* Modal de pago */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,30,80,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '420px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '20px' }}>Registrar pago</h2>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={lbl}>Monto {balance > 0 && <span style={{ color: '#7888a8', fontWeight: 400 }}>(saldo: ${fmt(balance)})</span>}</label>
                <input type="number" value={payAmount || ''} onChange={e => setPayAmount(+e.target.value)} min="0" step="any" placeholder="0.00" style={inp} />
                {balance > 0 && (
                  <button onClick={() => setPayAmount(balance)} style={{ background: '#f0f4ff', color: '#1a56e8', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '.72rem', cursor: 'pointer', marginTop: 6 }}>
                    Saldo completo (${fmt(balance)})
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Fecha</label>
                  <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Método</label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={inp}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Nota (opcional)</label>
                <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Ej: Primera cuota" style={inp} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setShowPayModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#f0f4ff', color: '#364061', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleAddPayment} disabled={savingPay || payAmount <= 0} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: savingPay ? '#93adf5' : '#0a7c4b', color: 'white', border: 'none', fontWeight: '700', cursor: savingPay ? 'not-allowed' : 'pointer' }}>
                {savingPay ? 'Guardando...' : '✓ Registrar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
