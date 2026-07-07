'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBizConfig, saveBizConfig, type BizConfig } from '@/lib/biz';

const defaultBiz: BizConfig = {
  name: '', address: '', phone: '', email: '', cuit: '', currency: 'ARS', footer: '',
};

export default function SettingsPage() {
  const router = useRouter();

  const [biz, setBiz]     = useState<BizConfig>(defaultBiz);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    getBizConfig().then(setBiz);
  }, []);

  async function handleSave() {
    setSaving(true);
    await saveBizConfig(biz);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

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
        <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '.8rem', cursor: 'pointer' }}>
          ← Dashboard
        </button>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0e1b3d', marginBottom: '8px' }}>
          Configuración
        </h1>
        <p style={{ color: '#7888a8', marginBottom: '24px', fontSize: '.88rem' }}>
          Estos datos aparecen en todos tus PDFs.
        </p>

        <div style={card}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0e1b3d', marginBottom: '16px' }}>
            Datos de tu negocio
          </h2>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={lbl}>Nombre del negocio</label>
              <input value={biz.name} onChange={e => setBiz({ ...biz, name: e.target.value })}
                placeholder="Mi Empresa SA" style={inp} />
            </div>
            <div>
              <label style={lbl}>Dirección</label>
              <input value={biz.address} onChange={e => setBiz({ ...biz, address: e.target.value })}
                placeholder="Av. Corrientes 1234, CABA" style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={lbl}>Teléfono</label>
                <input value={biz.phone} onChange={e => setBiz({ ...biz, phone: e.target.value })}
                  placeholder="+54 9 11..." style={inp} />
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input value={biz.email} onChange={e => setBiz({ ...biz, email: e.target.value })}
                  placeholder="contacto@minegocio.com" style={inp} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={lbl}>CUIT</label>
                <input value={biz.cuit} onChange={e => setBiz({ ...biz, cuit: e.target.value })}
                  placeholder="20-12345678-9" style={inp} />
              </div>
              <div>
                <label style={lbl}>Moneda</label>
                <select value={biz.currency} onChange={e => setBiz({ ...biz, currency: e.target.value })}
                  style={{ ...inp }}>
                  <option value="ARS">ARS — Peso argentino</option>
                  <option value="USD">USD — Dólar</option>
                  <option value="UYU">UYU — Peso uruguayo</option>
                </select>
              </div>
            </div>
            <div>
              <label style={lbl}>Pie de página en PDF</label>
              <input value={biz.footer} onChange={e => setBiz({ ...biz, footer: e.target.value })}
                placeholder="Válido por 15 días. Precios sujetos a cambio." style={inp} />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '14px', borderRadius: '10px',
          background: saved ? '#0a7c4b' : saving ? '#93adf5' : '#1a56e8',
          color: 'white', fontWeight: '700', fontSize: '1rem',
          border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          transition: 'background .3s',
        }}>
          {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  );
}