'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  getProjects, createProject, updateProject, deleteProject,
  Project, ProjectStatus, PROJECT_STATUS_META, PROJECT_STATUSES, computeProjectFinancials,
} from '@/lib/projects';
import { getClients, Client } from '@/lib/clients';
import { getDocuments, Document } from '@/lib/documents';

export default function ProjectsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [projects, setProjects]       = useState<Project[]>([]);
  const [docs, setDocs]               = useState<Document[]>([]);
  const [clients, setClients]         = useState<Client[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [showModal, setShowModal]     = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const [name, setName]               = useState('');
  const [clientId, setClientId]       = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus]           = useState<ProjectStatus>('borrador');
  const [dateStart, setDateStart]     = useState('');
  const [dateDue, setDateDue]         = useState('');
  const [progress, setProgress]       = useState(0);
  const [budget, setBudget]           = useState(0);
  const [notes, setNotes]             = useState('');
  const [docIds, setDocIds]           = useState<string[]>([]);

  const [financials, setFinancials]   = useState<Record<string, { facturado: number; cobrado: number }>>({});

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getProjects(user.uid),
      getDocuments(user.uid),
      getClients(user.uid),
    ]).then(async ([p, d, c]) => {
      setProjects(p); setDocs(d); setClients(c);
      // Calcular financiero por proyecto
      const f: Record<string, { facturado: number; cobrado: number }> = {};
      await Promise.all(p.map(async proj => {
        const fin = await computeProjectFinancials(user.uid, proj, d);
        f[proj.id!] = { facturado: fin.facturado, cobrado: fin.cobrado };
      }));
      setFinancials(f);
      setDataLoading(false);
    });
  }, [user]);

  function resetForm() {
    setName(''); setClientId(''); setDescription(''); setStatus('borrador');
    setDateStart(''); setDateDue(''); setProgress(0); setBudget(0); setNotes(''); setDocIds([]);
  }

  function openNew() {
    setEditingId(null);
    resetForm();
    setError('');
    setShowModal(true);
  }

  function openEdit(p: Project) {
    setEditingId(p.id!);
    setName(p.name); setClientId(p.clientId ?? ''); setDescription(p.description);
    setStatus(p.status); setDateStart(p.dateStart); setDateDue(p.dateDue);
    setProgress(p.progress); setBudget(p.budget); setNotes(p.notes);
    setDocIds(p.docIds ?? []);
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!user) return;
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      const client = clients.find(c => c.id === clientId);
      const data: Project = {
        name, clientId: clientId || undefined, clientName: client?.name,
        description, status, dateStart, dateDue, progress, budget, notes, docIds,
      };
      if (editingId) {
        await updateProject(user.uid, editingId, data);
        setProjects(projects.map(p => p.id === editingId ? { ...p, ...data } : p));
      } else {
        const id = await createProject(user.uid, data);
        setProjects([{ id, ...data }, ...projects]);
      }
      setShowModal(false);
    } catch {
      setError('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user || !confirm('¿Eliminar este proyecto? Los documentos vinculados no se borran.')) return;
    await deleteProject(user.uid, id);
    setProjects(projects.filter(p => p.id !== id));
  }

  function toggleDoc(docId: string) {
    setDocIds(docIds.includes(docId) ? docIds.filter(x => x !== docId) : [...docIds, docId]);
  }

  const filtered = projects.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !(p.clientName ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none', color: '#0e1b3d',
  };
  const lbl = {
    display: 'block' as const, fontSize: '.78rem',
    fontWeight: '600' as const, color: '#364061', marginBottom: '5px',
  };

  const docsForClient = clientId ? docs.filter(d => d.clientName === clients.find(c => c.id === clientId)?.name) : docs;

  if (loading || dataLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#7888a8' }}>Cargando proyectos...</div>
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
            + Nuevo proyecto
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '8px' }}>
          Proyectos ({projects.length})
        </h1>
        <p style={{ color: '#7888a8', marginBottom: '20px', fontSize: '.88rem' }}>
          Agrupá documentos por trabajo y hacé seguimiento del progreso.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o cliente..."
            style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #dde3f5', fontSize: '.85rem', outline: 'none' }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | ProjectStatus)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #dde3f5', fontSize: '.85rem', color: '#0e1b3d', background: 'white' }}>
            <option value="all">Todos los estados</option>
            {PROJECT_STATUSES.map(s => <option key={s} value={s}>{PROJECT_STATUS_META[s].label}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', padding: '48px', textAlign: 'center', color: '#7888a8' }}>
            {projects.length === 0 ? 'Todavía no creaste ningún proyecto. Agrupá documentos por trabajo para llevar seguimiento.' : 'No hay proyectos con ese filtro.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filtered.map(p => {
              const meta = PROJECT_STATUS_META[p.status];
              const fin = financials[p.id!];
              const overdue = p.dateDue && p.status === 'en_curso' && new Date(p.dateDue + 'T00:00:00') < new Date(new Date().toDateString());
              return (
                <div key={p.id} style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(10,30,80,.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#0e1b3d', fontSize: '1.05rem' }}>{p.name}</span>
                        <span style={{ background: meta.bg, color: meta.color, borderRadius: '20px', padding: '3px 10px', fontSize: '.72rem', fontWeight: 600 }}>
                          {meta.label}
                        </span>
                        {overdue && (
                          <span style={{ background: '#fee2e2', color: '#c41c1c', borderRadius: '20px', padding: '3px 10px', fontSize: '.68rem', fontWeight: 600 }}>
                            ⚠ Atrasado
                          </span>
                        )}
                      </div>
                      {p.clientName && <div style={{ fontSize: '.82rem', color: '#364061', marginBottom: '6px' }}>👤 {p.clientName}</div>}
                      {p.description && <div style={{ fontSize: '.82rem', color: '#7888a8', marginBottom: '8px' }}>{p.description}</div>}

                      <div style={{ display: 'flex', gap: '16px', fontSize: '.78rem', color: '#7888a8', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {p.dateStart && <span>Inicio: {p.dateStart}</span>}
                        {p.dateDue && <span>Entrega: {p.dateDue}</span>}
                        <span>{p.docIds?.length || 0} doc(s) vinculado(s)</span>
                      </div>

                      {/* Progreso */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: '#364061', marginBottom: 4 }}>
                          <span>Progreso</span><span>{p.progress}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#f0f4ff', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p.progress}%`, background: p.status === 'completado' ? '#0a7c4b' : '#1a56e8', transition: 'width .3s' }} />
                        </div>
                      </div>

                      {/* Financiero */}
                      {(p.budget > 0 || fin) && (
                        <div style={{ display: 'flex', gap: '12px', fontSize: '.75rem', flexWrap: 'wrap' }}>
                          {p.budget > 0 && <span style={{ color: '#364061' }}>Presupuesto: <strong>${fmt(p.budget)}</strong></span>}
                          {fin && fin.facturado > 0 && <span style={{ color: '#0e1b3d' }}>Facturado: <strong>${fmt(fin.facturado)}</strong></span>}
                          {fin && fin.cobrado > 0 && <span style={{ color: '#0a7c4b' }}>Cobrado: <strong>${fmt(fin.cobrado)}</strong></span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => openEdit(p)} style={{ background: '#f0f4ff', color: '#1a56e8', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
                        Editar
                      </button>
                      <button onClick={() => handleDelete(p.id!)} style={{ background: '#fee2e2', color: '#c41c1c', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '.73rem', cursor: 'pointer' }}>
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

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,30,80,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '24px' }}>
              {editingId ? 'Editar proyecto' : 'Nuevo proyecto'}
            </h2>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Rediseño de marca" style={inp} />
              </div>
              <div>
                <label style={lbl}>Cliente</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} style={inp}>
                  <option value="">— Sin cliente —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Descripción</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalle del proyecto" rows={2} style={{ ...inp, resize: 'vertical' as const }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Estado</label>
                  <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} style={inp}>
                    {PROJECT_STATUSES.map(s => <option key={s} value={s}>{PROJECT_STATUS_META[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Presupuesto ($)</label>
                  <input type="number" value={budget || ''} onChange={e => setBudget(+e.target.value)} min="0" step="any" placeholder="0.00" style={inp} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Fecha de inicio</label>
                  <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Fecha de entrega</label>
                  <input type="date" value={dateDue} onChange={e => setDateDue(e.target.value)} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Progreso: {progress}%</label>
                <input type="range" value={progress} onChange={e => setProgress(+e.target.value)} min="0" max="100" step="5" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={lbl}>Documentos vinculados</label>
                <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1.5px solid #dde3f5', borderRadius: '8px', padding: '8px' }}>
                  {docsForClient.length === 0 ? (
                    <div style={{ fontSize: '.78rem', color: '#7888a8', padding: '4px' }}>No hay documentos {clientId ? 'para este cliente' : ''}.</div>
                  ) : docsForClient.map(d => (
                    <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '.8rem', color: '#364061', cursor: 'pointer' }}>
                      <input type="checkbox" checked={docIds.includes(d.id!)} onChange={() => toggleDoc(d.id!)} />
                      <span>{d.type === 'presupuesto' ? '📄' : '🧾'} #{d.num} · {d.clientName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Notas internas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas internas del proyecto" rows={2} style={{ ...inp, resize: 'vertical' as const }} />
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
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear proyecto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
