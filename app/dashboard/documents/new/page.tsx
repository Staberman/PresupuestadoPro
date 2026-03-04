'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createDocument, DocItem, Document } from '@/lib/documents';

const emptyItem = (): DocItem => ({ desc: '', qty: 1, price: 0, disc: 0 });

export default function NewDocumentPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [type, setType]               = useState<'presupuesto' | 'factura'>('presupuesto');
  const [num, setNum]                 = useState('');
  const [clientName, setClientName]   = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddr, setClientAddr]   = useState('');
  const [dateIssue, setDateIssue]     = useState(new Date().toISOString().split('T')[0]);
  const [dateExpiry, setDateExpiry]   = useState('');
  const [items, setItems]             = useState<DocItem[]>([emptyItem()]);
  const [notes, setNotes]             = useState('');
  const [discount, setDiscount]       = useState(0);
  const [ivaRate, setIvaRate]         = useState(0);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  function updateItem(i: number, field: keyof DocItem, value: string | number) {
    const next = [...items];
    (next[i] as any)[field] = value;
    setItems(next);
  }

  function addItem() { setItems([...items, emptyItem()]); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }

  function calcSubtotal() {
    return items.reduce((a, it) => {
      const line = it.qty * it.price;
      return a + line - line * (it.disc || 0) / 100;
    }, 0);
  }

  function calcTotal() {
    const sub = calcSubtotal();
    return (sub - sub * discount / 100) * (1 + ivaRate / 100);
  }

  async function handleSave() {
    if (!user) return;
    if (!clientName.trim()) { setError('Ingresá el nombre del cliente.'); return; }
    if (!items[0].desc) { setError('Agregá al menos un ítem.'); return; }
    setSaving(true);
    setError('');
    try {
      const docData: Document = {
        type, num: num || `${type === 'presupuesto' ? 'P' : 'F'}-${Date.now()}`,
        status: 'pending',
        clientName, clientEmail, clientPhone, clientAddr,
        items, notes, discount, ivaRate,
        dateIssue, dateExpiry,
      };
      await createDocument(user.uid, docData, profile?.proStatus || 'free');
      router.push('/dashboard/documents');
    } catch (err: any) {
      if (err.message === 'LIMIT_REACHED') {
        setError('Alcanzaste el límite de 50 documentos este mes. Actualizá a Pro.');
      } else {
        setError('Error al guardar. Intentá de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

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

  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: '#0f2d6e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem' }}>
          Presupuesto<span style={{ color: '#6389f0' }}>Pro</span>
        </div>
        <button onClick={() => router.push('/dashboard/documents')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', cursor: 'pointer' }}>
          ← Volver
        </button>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '24px' }}>
          Nuevo documento
        </h1>

        <div style={card}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {(['presupuesto', 'factura'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontWeight: '600',
                fontSize: '.85rem', cursor: 'pointer', border: '2px solid',
                borderColor: type === t ? '#1a56e8' : '#dde3f5',
                background: type === t ? '#f0f4ff' : 'white',
                color: type === t ? '#1a56e8' : '#364061',
              }}>
                {t === 'presupuesto' ? '📄 Presupuesto' : '🧾 Factura'}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={lbl}>Número</label>
              <input value={num} onChange={e => setNum(e.target.value)} placeholder="P-001 (opcional)" style={inp} />
            </div>
            <div>
              <label style={lbl}>Fecha de emisión</label>
              <input type="date" value={dateIssue} onChange={e => setDateIssue(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Fecha de vencimiento</label>
              <input type="date" value={dateExpiry} onChange={e => setDateExpiry(e.target.value)} style={inp} />
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', marginBottom: '16px' }}>Cliente</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Nombre *</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" style={inp} />
            </div>
            <div>
              <label style={lbl}>Email</label>
              <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@email.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>Teléfono</label>
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+54 9 11..." style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Dirección</label>
              <input value={clientAddr} onChange={e => setClientAddr(e.target.value)} placeholder="Dirección" style={inp} />
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', marginBottom: '16px' }}>Ítems</h2>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '10px', alignItems: 'end' }}>
              <div>
                {i === 0 && <label style={lbl}>Descripción</label>}
                <input value={it.desc} onChange={e => updateItem(i, 'desc', e.target.value)} placeholder="Descripción del servicio" style={inp} />
              </div>
              <div>
                {i === 0 && <label style={lbl}>Cant.</label>}
                <input type="number" value={it.qty} onChange={e => updateItem(i, 'qty', +e.target.value)} min="1" style={inp} />
              </div>
              <div>
                {i === 0 && <label style={lbl}>Precio</label>}
                <input type="number" value={it.price} onChange={e => updateItem(i, 'price', +e.target.value)} min="0" style={inp} />
              </div>
              <div>
                {i === 0 && <label style={lbl}>Desc.%</label>}
                <input type="number" value={it.disc} onChange={e => updateItem(i, 'disc', +e.target.value)} min="0" max="100" style={inp} />
              </div>
              <div>
                {i === 0 && <label style={lbl}>&nbsp;</label>}
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} style={{ background: '#fee2e2', color: '#c41c1c', border: 'none', borderRadius: '7px', padding: '10px 12px', cursor: 'pointer' }}>✕</button>
                )}
              </div>
            </div>
          ))}
          <button onClick={addItem} style={{ background: '#f0f4ff', color: '#1a56e8', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '.82rem', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
            + Agregar ítem
          </button>
          <div style={{ marginTop: '20px', borderTop: '1px solid #dde3f5', paddingTop: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxWidth: '400px', marginLeft: 'auto' }}>
              <div>
                <label style={lbl}>Descuento global %</label>
                <input type="number" value={discount} onChange={e => setDiscount(+e.target.value)} min="0" max="100" style={inp} />
              </div>
              <div>
                <label style={lbl}>IVA %</label>
                <input type="number" value={ivaRate} onChange={e => setIvaRate(+e.target.value)} min="0" style={inp} />
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <div style={{ fontSize: '.85rem', color: '#7888a8', marginBottom: '4px' }}>Subtotal: ${fmt(calcSubtotal())}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0e1b3d' }}>Total: ${fmt(calcTotal())}</div>
            </div>
          </div>
        </div>

        <div style={card}>
          <label style={lbl}>Notas / condiciones</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Condiciones de pago, validez del presupuesto, etc."
            rows={3} style={{ ...inp, resize: 'vertical' as const }} />
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#c41c1c', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '.85rem' }}>
            {error}
          </div>
        )}

        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '14px', borderRadius: '10px',
          background: saving ? '#93adf5' : '#1a56e8', color: 'white',
          fontWeight: '700', fontSize: '1rem', border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
        }}>
          {saving ? 'Guardando...' : '✓ Guardar documento'}
        </button>
      </div>
    </div>
  );
}