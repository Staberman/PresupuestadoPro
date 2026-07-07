'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  createProposal, updateProposal, getProposal, suggestProposalNumber,
  ProposalSection, newSection,
} from '@/lib/proposals';
import { getTemplates, ensureBuiltinTemplate, Template } from '@/lib/templates';
import { getClients, Client } from '@/lib/clients';

interface Props {
  mode: 'new' | 'edit';
  proposalId?: string;
}

export default function ProposalForm({ mode, proposalId }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [num, setNum]                     = useState('');
  const [title, setTitle]                 = useState('');
  const [clientName, setClientName]       = useState('');
  const [clientEmail, setClientEmail]     = useState('');
  const [clientPhone, setClientPhone]     = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [totalAmount, setTotalAmount]     = useState(0);
  const [dateIssue, setDateIssue]         = useState(new Date().toISOString().split('T')[0]);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [notes, setNotes]                 = useState('');
  const [sections, setSections]           = useState<ProposalSection[]>([newSection()]);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  const [templates, setTemplates]         = useState<Template[]>([]);
  const [clients, setClients]             = useState<Client[]>([]);
  const [preview, setPreview]             = useState(false);
  const dragIdx = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    ensureBuiltinTemplate(user.uid).then(() => {
      getTemplates(user.uid).then(setTemplates);
      getClients(user.uid).then(setClients);
    });
  }, [user]);

  // Numeración automática + cargar propuesta si es edit
  useEffect(() => {
    if (!user) return;
    if (mode === 'new') {
      suggestProposalNumber(user.uid).then(setNum).catch(() => {});
    } else if (mode === 'edit' && proposalId) {
      getProposal(user.uid, proposalId).then(p => {
        if (!p) { setError('Propuesta no encontrada.'); return; }
        setNum(p.num); setTitle(p.title); setClientName(p.clientName);
        setClientEmail(p.clientEmail); setClientPhone(p.clientPhone);
        setClientCompany(p.clientCompany ?? ''); setTotalAmount(p.totalAmount);
        setDateIssue(p.dateIssue); setWhatsappPhone(p.whatsappPhone ?? '');
        setNotes(p.notes ?? ''); setSections(p.sections);
      });
    }
  }, [user, mode, proposalId]);

  function applyTemplate(tpl: Template) {
    setTitle(tpl.title);
    setTotalAmount(tpl.totalAmount);
    setNotes(tpl.notes);
    setSections(tpl.sections.map(s => ({ ...s, id: Math.random().toString(36).slice(2, 9) })));
  }

  function applyClient(clientId: string) {
    const c = clients.find(c => c.id === clientId);
    if (!c) return;
    setClientName(c.name); setClientEmail(c.email); setClientPhone(c.phone);
    setClientCompany(c.company ?? '');
    if (c.phone) setWhatsappPhone(c.phone);
  }

  function updateSection(id: string, field: keyof ProposalSection, value: unknown) {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } as ProposalSection : s));
  }

  function updateBullet(sectionId: string, idx: number, value: string) {
    setSections(sections.map(s => {
      if (s.id !== sectionId) return s;
      const bullets = [...s.bullets];
      bullets[idx] = value;
      return { ...s, bullets };
    }));
  }

  function addBullet(sectionId: string) {
    setSections(sections.map(s => s.id === sectionId ? { ...s, bullets: [...s.bullets, ''] } : s));
  }

  function removeBullet(sectionId: string, idx: number) {
    setSections(sections.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, bullets: s.bullets.filter((_, i) => i !== idx) };
    }));
  }

  function addSection(isInfo: boolean) {
    setSections([...sections, newSection(isInfo)]);
  }

  function removeSection(id: string) {
    setSections(sections.filter(s => s.id !== id));
  }

  function moveSection(id: string, dir: -1 | 1) {
    const idx = sections.findIndex(s => s.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const next = [...sections];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setSections(next);
  }

  function handleDragStart(e: React.DragEvent, idx: number) {
    e.dataTransfer.effectAllowed = 'move';
    dragIdx.current = idx;
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const next = [...sections];
    const [removed] = next.splice(dragIdx.current, 1);
    next.splice(idx, 0, removed);
    setSections(next);
    dragIdx.current = null;
  }

  function handleDragEnd() {
    dragIdx.current = null;
  }

  async function handleSave() {
    if (!user) return;
    if (!title.trim()) { setError('Ingresá un título para la propuesta.'); return; }
    if (!clientName.trim()) { setError('Ingresá el nombre del cliente.'); return; }
    if (sections.length === 0 || !sections[0].title) { setError('Agregá al menos una sección con título.'); return; }
    setSaving(true);
    setError('');
    try {
      const base = {
        num, title, clientName, clientEmail, clientPhone, clientCompany,
        sections, totalAmount, dateIssue, whatsappPhone, notes,
      };
      if (mode === 'edit' && proposalId) {
        await updateProposal(user.uid, proposalId, base);
      } else {
        await createProposal(user.uid, { ...base, status: 'borrador' });
      }
      router.push('/dashboard/proposals');
    } catch {
      setError('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

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

  // Contar secciones numeradas para mostrar el número automático
  let numberedCount = 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: '#0f2d6e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem' }}>
          Presupuesto<span style={{ color: '#6389f0' }}>Pro</span>
        </div>
        <button onClick={() => router.push('/dashboard/proposals')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', cursor: 'pointer' }}>
          ← Volver
        </button>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '760px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '24px' }}>
          {mode === 'edit' ? 'Editar propuesta' : 'Nueva propuesta'}
        </h1>

        {/* Plantilla */}
        {mode === 'new' && templates.length > 0 && (
          <div style={card}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', marginBottom: '12px' }}>Plantillas</h2>
            <p style={{ fontSize: '.82rem', color: '#7888a8', marginBottom: '12px' }}>Empezá desde una plantilla pre-cargada:</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {templates.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)} style={{
                  background: '#f0f4ff', color: '#1a56e8', border: '1.5px solid #dde3f5',
                  borderRadius: '10px', padding: '10px 16px', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer',
                }}>
                  {t.builtin ? '⭐ ' : ''}{t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Datos generales */}
        <div style={card}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', marginBottom: '16px' }}>Datos generales</h2>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={lbl}>Número</label>
                <input value={num} onChange={e => setNum(e.target.value)} placeholder="Automático" style={inp} />
              </div>
              <div>
                <label style={lbl}>Fecha de emisión</label>
                <input type="date" value={dateIssue} onChange={e => setDateIssue(e.target.value)} style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>Título de la propuesta *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Campaña completa de marketing" style={inp} />
            </div>
            <div>
              <label style={lbl}>Monto total ($)</label>
              <input type="number" value={totalAmount || ''} onChange={e => setTotalAmount(+e.target.value)} min="0" step="any" placeholder="0.00" style={{ ...inp, fontSize: '1.1rem', fontWeight: 700, color: '#0f2d6e' }} />
            </div>
          </div>
        </div>

        {/* Cliente */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', margin: 0 }}>Cliente</h2>
            {clients.length > 0 && (
              <select
                onChange={e => { if (e.target.value) applyClient(e.target.value); e.target.value = ''; }}
                defaultValue=""
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #dde3f5', fontSize: '.8rem', color: '#0e1b3d', background: 'white' }}
              >
                <option value="" disabled>Cargar de clientes…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}
              </select>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={lbl}>Nombre / contacto *</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" style={inp} />
            </div>
            <div>
              <label style={lbl}>Razón social / empresa</label>
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
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>WhatsApp para consultas (link al pie)</label>
              <input value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} placeholder="+54 9 11..." style={inp} />
            </div>
          </div>
        </div>

        {/* Secciones */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', margin: 0 }}>
              {preview ? '👁️ Vista previa' : 'Secciones'}
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPreview(!preview)} style={{ background: preview ? '#0f2d6e' : '#f0f4ff', color: preview ? 'white' : '#364061', border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer' }}>
                {preview ? '✏️ Editar' : '👁️ Vista previa'}
              </button>
              {!preview && (<>
                <button onClick={() => addSection(false)} style={{ background: '#1a56e8', color: 'white', border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer' }}>
                  + Sección
                </button>
                <button onClick={() => addSection(true)} style={{ background: '#364061', color: 'white', border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer' }}>
                  + Sección informativa
                </button>
              </>)}
            </div>
          </div>

          {preview ? (
            /* Vista previa en vivo */
            <div>
              <div style={{ background: '#f0f4ff', borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center', border: '2px dashed #dde3f5' }}>
                <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#7888a8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Monto total</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f2d6e' }}>${fmt(totalAmount || 0)}</div>
              </div>
              {sections.map(s => {
                if (!s.isInfo) numberedCount++;
                return (
                  <div key={s.id} style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(10,30,80,.08)', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0e1b3d', marginBottom: '10px' }}>
                      {s.isInfo ? '' : `${numberedCount}. `}{s.title || 'Sin título'}
                    </h2>
                    {s.description && (
                      <div style={{ fontSize: '.88rem', color: '#364061', lineHeight: 1.6, marginBottom: s.bullets.filter(b => b.trim()).length ? '14px' : 0, whiteSpace: 'pre-wrap' }}>
                        {s.description}
                      </div>
                    )}
                    {s.bullets.filter(b => b.trim()).length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#364061', fontSize: '.85rem', lineHeight: 1.7 }}>
                        {s.bullets.filter(b => b.trim()).map((b, bi) => <li key={bi}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
              {sections.length === 0 && (
                <div style={{ textAlign: 'center', color: '#7888a8', padding: '32px', fontSize: '.85rem' }}>
                  No hay secciones todavía. Cambiá a edición para agregar contenido.
                </div>
              )}
            </div>
          ) : (
            /* Editor de secciones */
            <div>
              {sections.map((s, i) => {
            if (!s.isInfo) numberedCount++;
            return (
              <div key={s.id} style={{
                border: '1.5px solid #dde3f5', borderRadius: '12px', padding: '18px',
                marginBottom: '14px', background: s.isInfo ? '#f9fafb' : 'white',
                cursor: 'grab',
              }}
                draggable
                onDragStart={e => handleDragStart(e, i)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: s.isInfo ? '#e5e7eb' : '#0f2d6e', color: 'white',
                      borderRadius: '6px', padding: '3px 8px', fontSize: '.72rem', fontWeight: 700,
                    }}>
                      {s.isInfo ? 'ℹ' : numberedCount}
                    </span>
                    <span style={{ fontSize: '.78rem', color: '#7888a8' }}>
                      {s.isInfo ? 'Sección informativa' : 'Sección numerada'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => moveSection(s.id, -1)} disabled={i === 0} style={{ background: '#f0f4ff', color: '#364061', border: 'none', borderRadius: '5px', padding: '4px 8px', fontSize: '.72rem', cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.4 : 1 }}>↑</button>
                    <button onClick={() => moveSection(s.id, 1)} disabled={i === sections.length - 1} style={{ background: '#f0f4ff', color: '#364061', border: 'none', borderRadius: '5px', padding: '4px 8px', fontSize: '.72rem', cursor: i === sections.length - 1 ? 'not-allowed' : 'pointer', opacity: i === sections.length - 1 ? 0.4 : 1 }}>↓</button>
                    <button onClick={() => removeSection(s.id)} style={{ background: '#fee2e2', color: '#c41c1c', border: 'none', borderRadius: '5px', padding: '4px 8px', fontSize: '.72rem', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <input
                    value={s.title}
                    onChange={e => updateSection(s.id, 'title', e.target.value)}
                    placeholder="Título de la sección"
                    style={{ ...inp, fontWeight: 700, fontSize: '.95rem' }}
                  />
                  <textarea
                    value={s.description}
                    onChange={e => updateSection(s.id, 'description', e.target.value)}
                    placeholder="Descripción de la sección (párrafo inicial)..."
                    rows={3}
                    style={{ ...inp, resize: 'vertical' as const }}
                  />
                  {/* Bullets */}
                  <div>
                    <div style={{ fontSize: '.75rem', fontWeight: 600, color: '#364061', marginBottom: '6px' }}>Características incluidas (bullets):</div>
                    {s.bullets.map((b, bi) => (
                      <div key={bi} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ color: '#1a56e8', fontSize: '.85rem', paddingTop: '8px' }}>•</span>
                        <input
                          value={b}
                          onChange={e => updateBullet(s.id, bi, e.target.value)}
                          placeholder="Característica incluida..."
                          style={{ ...inp, flex: 1 }}
                        />
                        <button onClick={() => removeBullet(s.id, bi)} style={{ background: '#fee2e2', color: '#c41c1c', border: 'none', borderRadius: '5px', padding: '6px 10px', fontSize: '.72rem', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => addBullet(s.id)} style={{ background: '#f0f4ff', color: '#1a56e8', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '.72rem', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}>
                      + Agregar bullet
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
              {sections.length === 0 && (
                <div style={{ textAlign: 'center', color: '#7888a8', padding: '24px', fontSize: '.85rem' }}>
                  Agregá secciones con los botones de arriba.
                </div>
              )}
            </div>
          )} {/* fin preview/edit */}
        </div>

        {/* Notas */}
        <div style={card}>
          <label style={lbl}>Notas internas (opcional, no visibles para el cliente)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' as const }} />
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
          {saving ? 'Guardando...' : mode === 'edit' ? '✓ Guardar cambios' : '✓ Crear propuesta'}
        </button>
      </div>
    </div>
  );
}
