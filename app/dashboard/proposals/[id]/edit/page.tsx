'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getProposal, Proposal } from '@/lib/proposals';
import ProposalForm from '../../_components/ProposalForm';

export default function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposal, setProposal]     = useState<Proposal | null>(null);
  const [notFound, setNotFound]     = useState(false);

  useEffect(() => { params.then(p => setProposalId(p.id)); }, [params]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user && proposalId) {
      getProposal(user.uid, proposalId).then(p => {
        if (!p) { setNotFound(true); return; }
        setProposal(p);
      });
    }
  }, [user, proposalId]);

  if (loading || !proposalId) return null;

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#0e1b3d', fontWeight: 700, marginBottom: 12 }}>Propuesta no encontrada</div>
          <button onClick={() => router.push('/dashboard/proposals')} style={{ background: '#1a56e8', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#7888a8' }}>Cargando...</div>
      </div>
    );
  }

  return <ProposalForm mode="edit" proposalId={proposalId} />;
}
