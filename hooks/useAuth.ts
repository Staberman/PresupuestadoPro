import { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type Plan = 'free' | 'monthly' | 'lifetime';

export interface UserProfile {
  uid:         string;
  email:       string | null;
  proStatus:   Plan;
  createdAt:   string;
}

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Load profile from Firestore
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function register(email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Create user document in Firestore
    const newProfile: UserProfile = {
      uid:       cred.user.uid,
      email:     cred.user.email,
      proStatus: 'free',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), {
      ...newProfile,
      updatedAt: serverTimestamp(),
    });
    setProfile(newProfile);
    return cred.user;
  }

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  }

  const isPro = profile?.proStatus === 'monthly' || profile?.proStatus === 'lifetime';

  return { user, profile, loading, isPro, register, login, logout };
}