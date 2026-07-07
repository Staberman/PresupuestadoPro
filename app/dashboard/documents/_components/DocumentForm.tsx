'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createDocument, updateDocument, ItemSection, SectionItem, Document } from '@/lib/documents';
import { getServices } from '@/lib/services';
import { getClients } from '@/lib/clients';
import { suggestNextNumber } from '@/lib/payments';

let idCounter = 0;
function uid() { return `s${++idCounter}`; }

function emptySection(): ItemSection {
  return { id: uid(), title: '', items: [{ id: uid(), name: '', price: 0 }] };
}
function emptyItem(): SectionItem {
  return { id: uid(), name: '', price: 0 };
}

interface Props {
  mode: 'new' | 'edit';
  initial?: Document;
  docId?: string;
}

export default function DocumentForm({ mode, initial, docId }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [type, setType]           = useState<'presupuesto' | 'factura'>(initial?.type ?? 'presupuesto');
  const [num, setNum]             = useState(initial?.num ?? '');
  const [clientName, setClientName]   = useState(initial?.clientName ?? '');
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? '');
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? '');
  const [clientCompany, setClientCompany] = useState(initial?.clientCompany ?? '');
  const [dateIssue, setDateIssue] = useState(initial?.dateIssue ?? new Date().toISOString().split('T')[0]);
  const [dateExpiry, setDateExpiry] = useState(initial?.dateExpiry ?? '');
  const [sections, setSections]   = useState<ItemSection[]>(initial?.items?.length ? initial.items : [emptySection()]);
  const [notes, setNotes]         = useState(initial?.notes ?? '');
  const [discount, setDiscount]   = useState(initial?.discount ?? 0);
  const [ivaRate, setIvaRate]     = useState(initial?.ivaRate ?? 0);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [services, setServices]   = useState<Awaited<ReturnType<typeof getServices>>>([]);
  const [clients, setClients]     = useState<Awaited<ReturnType<typeof getClients>>>([]);

  useEffect(() => {
    if (user) {
      getServices().then(setServices).catch(() => {});
      getClients().then(setClients).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (mode !== 'new' || !user) return;
    suggestNextNumber(type).then(setNum).catch(() => {});
  }, [user, mode, type]);

  function applyClient(clientId: string) {
    const c = clients.find(x => x.id === clientId);
    if (!c) return;
    setClientName(c.name);
    setClientEmail(c.email);
    setClientPhone(c.phone);
    setClientCompany(c.company ?? '');
  }

  function applyService(secIdx: number, itemIdx: number, serviceId: string) {
    const s = services.find(x => x.id === serviceId);
    if (!s) return;
    const next = sections.map((sec, si) =>
      si === secIdx
        ? { ...sec, items: sec.items.map((it, ii) =>
            ii === itemIdx ? { ...it, name: s.name, price: s.price } : it
          )}
        : sec
    );
    setSections(next);
  }

  function updateSection(secIdx: number, title: string) {
    setSections(sections.map((s, i) => i === secIdx ? { ...s, title } : s));
  }

  function addSection() { setSections([...sections, emptySection()]); }
  function removeSection(secIdx: number) {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, i) => i !== secIdx));
  }

  function updateItem(secIdx: number, itemIdx: number, field: 'name' | 'price', value: string | number) {
    setSections(sections.map((sec, si) =>
      si === secIdx
        ? { ...sec, items: sec.items.map((it, ii) =>
            ii === itemIdx ? { ...it, [field]: value } : it
          )}
        : sec
    ));
  }

  function addItem(secIdx: number) {
    setSections(sections.map((sec, si) =>
      si === secIdx ? { ...sec, items: [...sec.items, emptyItem()] } : sec
    ));
  }

  function removeItem(secIdx: number, itemIdx: number) {
    setSections(sections.map((sec, si) =>
      si === secIdx
        ? { ...sec, items: sec.items.filter((_, ii) => ii !== itemIdx) }
        : sec
    ));
  }

  function calcSubtotal() {
    return sections.reduce((a, sec) =>
      a + sec.items.reduce((b, it) => b + it.price, 0), 0);
  }

  function calcTotal() {
    const sub = calcSubtotal();
    return (sub - sub * discount / 100) * (1 + ivaRate / 100);
  }

  async function handleSave() {
    if (!user) return;
    if (!clientName.trim()) { setError('Ingresá el nombre del cliente.'); return; }
    const hasItem = sections.some(sec => sec.items.some(it => it.name.trim()));
    if (!hasItem) { setError('Agregá al menos un ítem en alguna sección.'); return; }
    setSaving(true);
    setError('');
    try {
      const docData: Document = {
        type,
        num: num || `${type === 'presupuesto' ? 'P' : 'F'}-${Date.now()}`,
        status: initial?.status ?? 'draft',
        clientName, clientEmail, clientPhone, clientCompany,
        items: sections,
        notes, discount, ivaRate,
        dateIssue, dateExpiry,
      };
      if (mode === 'edit' && docId) {
        await updateDocument(docId, docData);
      } else {
        await createDocument(docData);
      }
      router.push('/dashboard/documents');
    } catch {
      setError('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', color: '#0e1b3d',
    boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '.78rem',
    fontWeight: 600, color: '#364061', marginBottom: '5px',
  };
  const card: React.CSSProperties = {
    background: 'white', borderRadius: '14px',
    padding: '24px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px',
  };

  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
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
          {mode === 'edit' ? 'Editar documento' : 'Nuevo documento'}
        </h1>

        {/* ─── TIPO + NÚMERO + FECHAS ─── */}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={lbl}>Número</label>
              <input value={num} onChange={e => setNum(e.target.value)} placeholder="Automático" style={inp} />
            </div>
            <div>
              <label style={lbl}>Fecha de emisión</label>
              <input type="date" value={dateIssue} onChange={e => setDateIssue(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Vencimiento</label>
              <input type="date" value={dateExpiry} onChange={e => setDateExpiry(e.target.value)} style={inp} />
            </div>
          </div>
        </div>

        {/* ─── CLIENTE ─── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d' }}>Cliente</h2>
            {clients.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '.75rem', color: '#7888a8' }}>Cargar:</span>
                <select
                  onChange={e => { if (e.target.value) applyClient(e.target.value); e.target.value = ''; }}
                  defaultValue=""
                  style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #dde3f5', fontSize: '.8rem', color: '#0e1b3d', background: 'white' }}
                >
                  <option value="" disabled>Elegir cliente…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={lbl}>Nombre *</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" style={inp} />
            </div>
            <div>
              <label style={lbl}>Empresa</label>
              <input value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="Empresa SA" style={inp} />
            </div>
            <div>
              <label style={lbl}>Email</label>
              <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@email.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>Teléfono</label>
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+54 9 11..." style={inp} />
            </div>
          </div>
        </div>

        {/* ─── SERVICIOS ─── */}
        <div style={card}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', marginBottom: '16px' }}>Servicios</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sections.map((sec, si) => (
              <div key={sec.id} style={{
                border: '1.5px solid #e5eaf5', borderRadius: '12px',
                padding: '16px', background: '#fafbff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <input
                    value={sec.title}
                    onChange={e => updateSection(si, e.target.value)}
                    placeholder="Nombre de la categoría (ej: Branding, Desarrollo)"
                    style={{ flex: 1, ...inp, fontWeight: 600, border: 'none', background: 'transparent', padding: '6px 0' }}
                  />
                  {sections.length > 1 && (
                    <button onClick={() => removeSection(si)} style={{ background: '#fee2e2', color: '#c41c1c', border: 'none', borderRadius: '7px', padding: '6px 10px', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }}>
                      ✕
                    </button>
                  )}
                </div>

                {sec.items.map((it, ii) => (
                  <div key={it.id} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'end' }}>
                    <div style={{ flex: 1 }}>
                      {ii === 0 && <label style={lbl}>Item</label>}
                      <input
                        value={it.name}
                        onChange={e => updateItem(si, ii, 'name', e.target.value)}
                        placeholder="Nombre del servicio/paquete"
                        style={inp}
                      />
                    </div>
                    <div style={{ width: '140px' }}>
                      {ii === 0 && <label style={lbl}>Precio</label>}
                      <input
                        type="number"
                        value={it.price || ''}
                        onChange={e => updateItem(si, ii, 'price', +e.target.value)}
                        min="0"
                        step="any"
                        placeholder="0.00"
                        style={inp}
                      />
                    </div>
                    {services.length > 0 && ii === sec.items.length - 1 && (
                      <div>
                        {ii === 0 && <label style={{ ...lbl, color: 'transparent' }}>.</label>}
                        <select
                          onChange={e => { if (e.target.value) applyService(si, ii, e.target.value); e.target.value = ''; }}
                          defaultValue=""
                          style={{ padding: '10px', borderRadius: '8px', border: '1.5px solid #dde3f5', fontSize: '.8rem', color: '#0e1b3d', background: 'white', height: '41px' }}
                        >
                          <option value="" disabled>Catálogo</option>
                          {services.filter(s => s.active).map(s => (
                            <option key={s.id} value={s.id}>{s.name} — ${s.price.toLocaleString('es-AR')}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      {ii === 0 && <label style={{ ...lbl, color: 'transparent' }}>.</label>}
                      {sec.items.length > 1 && (
                        <button onClick={() => removeItem(si, ii)} style={{ background: '#fee2e2', color: '#c41c1c', border: 'none', borderRadius: '7px', padding: '10px 12px', cursor: 'pointer', lineHeight: 1 }}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addItem(si)}
                  style={{ background: 'transparent', color: '#1a56e8', border: 'none', borderRadius: '7px', padding: '6px 0', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Agregar item
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addSection}
            style={{ marginTop: '12px', background: '#f0f4ff', color: '#1a56e8', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer', width: '100%' }}
          >
            + Agregar categoría
          </button>

          {/* Totales */}
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
              <div style={{ fontSize: '.85rem', color: '#7888a8', marginBottom: '2px' }}>
                Subtotal: <strong style={{ color: '#364061' }}>${fmt(calcSubtotal())}</strong>
              </div>
              {discount > 0 && (
                <div style={{ fontSize: '.85rem', color: '#7888a8', marginBottom: '2px' }}>
                  Descuento ({discount}%): <strong style={{ color: '#c41c1c' }}>-${fmt(calcSubtotal() * discount / 100)}</strong>
                </div>
              )}
              {ivaRate > 0 && (
                <div style={{ fontSize: '.85rem', color: '#7888a8', marginBottom: '2px' }}>
                  IVA ({ivaRate}%): <strong style={{ color: '#0a7c4b' }}>+${fmt((calcSubtotal() - calcSubtotal() * discount / 100) * ivaRate / 100)}</strong>
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '1.5rem', fontWeight: '800', color: '#0f2d6e' }}>
                ${fmt(calcTotal())}
              </div>
            </div>
          </div>
        </div>

        {/* ─── NOTAS ─── */}
        <div style={card}>
          <label style={lbl}>Notas / condiciones</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Condiciones de pago, validez del presupuesto, etc."
            rows={3} style={{ ...inp, resize: 'vertical' }} />
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
          {saving ? 'Guardando...' : mode === 'edit' ? '✓ Guardar cambios' : '✓ Guardar documento'}
        </button>
      </div>
    </div>
  );
}
