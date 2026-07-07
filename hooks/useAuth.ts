import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

let _anonInit = false;
function ensureAnon() {
  if (_anonInit) return;
  _anonInit = true;
  const auth = getAuth();
  signInAnonymously(auth).catch(() => {});
}

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureAnon();
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Ensure profile exists
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!snap.exists()) {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
          });
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