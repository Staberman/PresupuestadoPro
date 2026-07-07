'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  return (
    <div style={{
      minHeight: '100vh', background: '#0f2d6e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ color: 'white', fontFamily: 'sans-serif' }}>Cargando...</div>
    </div>
  );
}
