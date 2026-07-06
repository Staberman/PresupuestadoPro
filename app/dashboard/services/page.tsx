'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getServices, createService, updateService, deleteService, Service } from '@/lib/services';
import { UNITS, UnitCode } from '@/lib/documents';

export default function ServicesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [services, setServices]         = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [search, setSearch]             = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  const [name, setName]           = useState('');
  const [desc, setDesc]           = useState('');
  const [unit, setUnit]           = useState<UnitCode>('hora');
  const [price, setPrice]         = useState(0);
  const [category, setCategory]   = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getServices(user.uid).then(data => {
        setServices(data);
        setServicesLoading(false);
      });
    }
  }, [user]);

  function openNew() {
    setEditingId(null);
    setName(''); setDesc(''); setUnit('hora'); setPrice(0); setCategory('');
    setError('');
    setShowModal(true);
  }

  function openEdit(s: Service) {
    setEditingId(s.id!);
    setName(s.name); setDesc(s.desc); setUnit(s.unit); setPrice(s.price); setCategory(s.category);
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!user) return;
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      const data: Service = { name, desc, unit, price, category, active: true };
      if (editingId) {
        await updateService(user.uid, editingId, data);
        setServices(services.map(s => s.id === editingId ? { ...s, ...data } : s));
      } else {
        const id = await createService(user.uid, data);
        setServices([{ id, ...data }, ...services]);
      }
      setShowModal(false);
    } catch {
      setError('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user || !confirm('¿Eliminar este servicio?')) return;
    await deleteService(user.uid, id);
    setServices(services.filter(s => s.id !== id));
  }

  async function handleToggle(s: Service) {
    if (!user || !s.id) return;
    const next = !s.active;
    await updateService(user.uid, s.id, { active: next });
    setServices(services.map(x => x.id === s.id ? { ...x, active: next } : x));
  }

  const filtered = services.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', color: '#0e1b3d',
  };
  const lbl = {
    display: 'block' as const, fontSize: '.78rem',
    fontWeight: '600' as const, color: '#364061', marginBottom: '5px',
  };

  if (loading || servicesLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#7888a8' }}>Cargando servicios...</div>
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
          <button onClick={openNew} style={{ background: '#1a56e8', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', fontWeight: '600', cursor: 'pointer' }}>
            + Nuevo servicio
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '8px' }}>
          Catálogo de servicios
        </h1>
        <p style={{ color: '#7888a8', marginBottom: '20px', fontSize: '.88rem' }}>
          Reutilizá tus servicios al armar presupuestos. ({services.length})
        </p>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o categoría..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', marginBottom: '20px' }}
        />

        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', padding: '48px', textAlign: 'center', color: '#7888a8' }}>
            {services.length === 0 ? 'Todavía no agregaste ningún servicio. Creá tu catálogo para armar presupuestos más rápido.' : 'No hay servicios con esa búsqueda.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(s => {
              const u = UNITS.find(x => x.code === s.unit);
              return (
                <div key={s.id} style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', color: '#0e1b3d' }}>{s.name}</span>
                        {s.category && (
                          <span style={{ background: '#f0f4ff', color: '#1a56e8', borderRadius: '20px', padding: '2px 8px', fontSize: '.7rem', fontWeight: 600 }}>
                            {s.category}
                          </span>
                        )}
                        <span style={{
                          background: s.active ? '#d1fae5' : '#fee2e2',
                          color: s.active ? '#0a7c4b' : '#c41c1c',
                          borderRadius: '20px', padding: '2px 8px', fontSize: '.68rem', fontWeight: 600,
                        }}>
                          {s.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {s.desc && <div style={{ fontSize: '.82rem', color: '#7888a8', marginBottom: '6px' }}>{s.desc}</div>}
                      <div style={{ fontSize: '.85rem', color: '#364061' }}>
                        Tarifa: <strong>${fmt(s.price)}</strong> <span style={{ color: '#7888a8' }}>por {u?.singular || 'unidad'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => handleToggle(s)} style={{ background: '#f0f4ff', color: '#364061', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                        {s.active ? 'Pausar' : 'Activar'}
                      </button>
                      <button onClick={() => openEdit(s)} style={{ background: '#f0f4ff', color: '#1a56e8', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                        Editar
                      </button>
                      <button onClick={() => handleDelete(s.id!)} style={{ background: '#fee2e2', color: '#c41c1c', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,30,80,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '24px' }}>
              {editingId ? 'Editar servicio' : 'Nuevo servicio'}
            </h2>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Diseño de logo" style={inp} />
              </div>
              <div>
                <label style={lbl}>Descripción</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Detalle del servicio" rows={2} style={{ ...inp, resize: 'vertical' as const }} />
              </div>
              <div>
                <label style={lbl}>Categoría</label>
                <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ej: Diseño, Consultoría" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Unidad</label>
                  <select value={unit} onChange={e => setUnit(e.target.value as UnitCode)} style={inp}>
                    {UNITS.map(u => <option key={u.code} value={u.code}>{u.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tarifa</label>
                  <input type="number" value={price} onChange={e => setPrice(+e.target.value)} min="0" style={inp} />
                </div>
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
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar servicio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
