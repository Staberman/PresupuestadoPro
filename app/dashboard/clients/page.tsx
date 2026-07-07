'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getClients, createClient, updateClient, deleteClient, Client, FISCAL_CONDITIONS, FiscalCondition } from '@/lib/clients';

export default function ClientsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [clients, setClients]             = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [search, setSearch]               = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [phone, setPhone]                 = useState('');
  const [addr, setAddr]                   = useState('');
  const [tags, setTags]                   = useState('');
  const [notes, setNotes]                 = useState('');
  const [company, setCompany]             = useState('');
  const [cuit, setCuit]                   = useState('');
  const [fiscalCondition, setFiscalCondition] = useState<FiscalCondition>('consumidor_final');
  const [sector, setSector]               = useState('');
  const [contactName, setContactName]     = useState('');
  const [contactRole, setContactRole]     = useState('');

  useEffect(() => {
    if (user) {
      getClients().then(data => {
        setClients(data);
        setClientsLoading(false);
      });
    }
  }, [user]);

  function resetForm() {
    setName(''); setEmail(''); setPhone(''); setAddr(''); setTags(''); setNotes('');
    setCompany(''); setCuit(''); setFiscalCondition('consumidor_final');
    setSector(''); setContactName(''); setContactRole('');
  }

  function openNew() {
    setEditingId(null);
    resetForm();
    setError('');
    setShowModal(true);
  }

  function openEdit(c: Client) {
    setEditingId(c.id!);
    setName(c.name); setEmail(c.email); setPhone(c.phone);
    setAddr(c.addr); setTags(c.tags); setNotes(c.notes);
    setCompany(c.company ?? ''); setCuit(c.cuit ?? '');
    setFiscalCondition(c.fiscalCondition ?? 'consumidor_final');
    setSector(c.sector ?? ''); setContactName(c.contactName ?? ''); setContactRole(c.contactRole ?? '');
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!user) return;
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      const data: Client = {
        name, email, phone, addr, tags, notes,
        company, cuit, fiscalCondition, sector, contactName, contactRole,
      };
      if (editingId) {
        await updateClient(editingId, data);
        setClients(clients.map(c => c.id === editingId ? { ...c, ...data } : c));
      } else {
        const id = await createClient(data);
        setClients([{ id, ...data }, ...clients]);
      }
      setShowModal(false);
    } catch {
      setError('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user || !confirm('¿Eliminar este cliente?')) return;
    await deleteClient(id);
    setClients(clients.filter(c => c.id !== id));
  }

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', color: '#0e1b3d',
  };
  const lbl = {
    display: 'block' as const, fontSize: '.78rem',
    fontWeight: '600' as const, color: '#364061', marginBottom: '5px',
  };

  if (loading || clientsLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#7888a8' }}>Cargando clientes...</div>
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
          <button onClick={openNew} style={{ background: '#1a56e8', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', fontWeight: '600', cursor: 'pointer' }}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '24px' }}>
          Clientes ({clients.length})
        </h1>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, empresa, email o teléfono..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', marginBottom: '20px' }}
        />

        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', padding: '48px', textAlign: 'center', color: '#7888a8' }}>
            {clients.length === 0 ? 'Todavía no agregaste ningún cliente.' : 'No hay clientes con esa búsqueda.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map(c => {
              const fc = FISCAL_CONDITIONS.find(f => f.code === c.fiscalCondition);
              return (
                <div key={c.id} style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: '#f0f4ff', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: '700', color: '#1a56e8', fontSize: '.9rem',
                    }}>
                      {c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEdit(c)} style={{ background: '#f0f4ff', color: '#1a56e8', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                        Editar
                      </button>
                      <button onClick={() => handleDelete(c.id!)} style={{ background: '#fee2e2', color: '#c41c1c', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', color: '#0e1b3d', marginBottom: '4px' }}>{c.name}</div>
                  {c.company && <div style={{ fontSize: '.82rem', color: '#364061', fontWeight: 600, marginBottom: '4px' }}>🏢 {c.company}</div>}
                  {c.email && <div style={{ fontSize: '.82rem', color: '#7888a8', marginBottom: '3px' }}>📧 {c.email}</div>}
                  {c.phone && <div style={{ fontSize: '.82rem', color: '#7888a8', marginBottom: '3px' }}>📱 {c.phone}</div>}
                  {(c.cuit || fc || c.sector) && (
                    <div style={{ fontSize: '.75rem', color: '#7888a8', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {c.cuit && <span style={{ background: '#f5f7fc', padding: '2px 6px', borderRadius: '4px' }}>CUIT: {c.cuit}</span>}
                      {fc && <span style={{ background: '#f5f7fc', padding: '2px 6px', borderRadius: '4px' }}>{fc.label}</span>}
                      {c.sector && <span style={{ background: '#f5f7fc', padding: '2px 6px', borderRadius: '4px' }}>{c.sector}</span>}
                    </div>
                  )}
                  {c.tags && (
                    <div style={{ marginTop: '10px' }}>
                      {c.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                        <span key={t} style={{ background: '#f0f4ff', color: '#1a56e8', borderRadius: '20px', padding: '2px 8px', fontSize: '.7rem', marginRight: '4px' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/\D/g, '')}?text=Hola ${encodeURIComponent(c.name)}!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: '12px', background: '#d1fae5', color: '#0a7c4b', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', fontWeight: '600', textDecoration: 'none' }}
                    >
                      💬 WhatsApp
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,30,80,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '24px' }}>
              {editingId ? 'Editar cliente' : 'Nuevo cliente'}
            </h2>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={lbl}>Nombre / contacto *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del contacto" style={inp} />
              </div>
              <div>
                <label style={lbl}>Razón social / empresa</label>
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Empresa SA" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Teléfono</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+54 9 11..." style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Dirección</label>
                <input value={addr} onChange={e => setAddr(e.target.value)} placeholder="Dirección" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>CUIT/CUIL</label>
                  <input value={cuit} onChange={e => setCuit(e.target.value)} placeholder="20-12345678-9" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Condición fiscal</label>
                  <select value={fiscalCondition} onChange={e => setFiscalCondition(e.target.value as FiscalCondition)} style={inp}>
                    {FISCAL_CONDITIONS.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Rubro / sector</label>
                <input value={sector} onChange={e => setSector(e.target.value)} placeholder="Ej: Tecnología, Construcción" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Contacto (nombre)</label>
                  <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Persona de contacto" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Cargo</label>
                  <input value={contactRole} onChange={e => setContactRole(e.target.value)} placeholder="Ej: Gerente, Compras" style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Tags (separados por coma)</label>
                <input value={tags} onChange={e => setTags(e.target.value)} placeholder="vip, recurrente" style={inp} />
              </div>
              <div>
                <label style={lbl}>Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas internas sobre el cliente" rows={3} style={{ ...inp, resize: 'vertical' as const }} />
              </div>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', color: '#c41c1c', borderRadius: '8px', padding: '10px 14px', fontSize: '.82rem', marginTop: '14px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#f0f4ff', color: '#364061', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: saving ? '#93adf5' : '#1a56e8', color: 'white', border: 'none', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
