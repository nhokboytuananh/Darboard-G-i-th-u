import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, Auth } from 'firebase/auth';
import firebaseConfigDefault from '../../firebase-applet-config.json';

// Resolve Firebase configuration dynamically:
// Prioritizes environment variables (Vercel/local env) and falls back to firebase-applet-config.json.
const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigDefault.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigDefault.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigDefault.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigDefault.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigDefault.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigDefault.appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigDefault.measurementId || '',
};

// Initialize Firebase App and Auth once
const app = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets readonly scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');

/**
 * Checks if the email is allowed based on VITE_ALLOWED_EMAILS.
 * If VITE_ALLOWED_EMAILS is not defined or empty, all emails are allowed.
 */
export const isEmailAllowed = (email: string | null): boolean => {
  const allowedEmailsStr = env.VITE_ALLOWED_EMAILS;
  if (!allowedEmailsStr) {
    return true; // No whitelist means all allowed
  }
  if (!email) {
    return false;
  }
  const allowedEmails = allowedEmailsStr
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  
  if (allowedEmails.length === 0) {
    return true;
  }
  return allowedEmails.includes(email.toLowerCase());
};

// Cache the access token in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initializes the auth listener to monitor sign-in states
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!isEmailAllowed(user.email)) {
        await auth.signOut();
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
        return;
      }

      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If we don't have a cached token in memory, we need to sign-in again
        // because Firebase Auth persists the user but doesn't automatically
        // cache the OAuth access token on reload unless we re-authenticate or use a cached method.
        // We will notify failure so the UI can show "Sign in with Google" to refresh the token.
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Starts the Google Sign-in flow and requests access scopes
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (!isEmailAllowed(user.email)) {
      await auth.signOut();
      cachedAccessToken = null;
      const error = new Error(`Email ${user.email || ''} không được phép truy cập hệ thống. Vui lòng liên hệ quản trị viên.`);
      (error as any).code = 'auth/email-not-allowed';
      throw error;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không lấy được mã Access Token từ Google Auth.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Lỗi đăng nhập Google Auth:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the currently cached OAuth access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Signs the user out
 */
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
