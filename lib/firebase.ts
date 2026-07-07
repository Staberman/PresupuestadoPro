import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:        process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:     process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

// Fallback para evitar crashes si env vars no se inlinearon en el build
const cfgOk = !!(firebaseConfig.apiKey && firebaseConfig.projectId);
let app: ReturnType<typeof initializeApp> | undefined;
try {
  app = cfgOk
    ? getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>)
    : getApps()[0];
} catch {
  // Firebase no disponible
}

export const db   = app ? getFirestore(app) : (null as unknown as ReturnType<typeof getFirestore>);
export default app;