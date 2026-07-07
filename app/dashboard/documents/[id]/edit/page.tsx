'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDocument, Document } from '@/lib/documents';
import DocumentForm from '../../_components/DocumentForm';

export default function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [docId, setDocId] = useState<string | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    params.then(p => setDocId(p.id));
  }, [params]);

  useEffect(() => {
    if (user && docId) {
      getDocument(docId).then(d => {
        if (!d) setNotFound(true);
        else setDoc(d);
      });
    }
  }, [user, docId]);

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
        <div style={{ color: '#7888a8' }}>Cargando documento...</div>
      </div>
    );
  }

  return <DocumentForm mode="edit" initial={doc} docId={docId} />;
}
