import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

let _anonInit = false;
function ensureAnon() {
  if (_anonInit) return;
  _anonInit = true;
  try {
    const auth = getAuth();
    signInAnonymously(auth).catch(() => {});
  } catch {
    // Firebase no configurado
  }
}

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    ensureAnon();
    let auth;
    try {
      auth = getAuth();
    } catch {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Firma / cuenta existe — evitar loop de escritura
        const snap = await getDoc(doc(db!, 'users', firebaseUser.uid)).catch(() => null);
        if (!snap?.exists()) {
          await setDoc(doc(db!, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
}