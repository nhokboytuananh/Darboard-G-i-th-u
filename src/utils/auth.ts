import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App and Auth once
const app = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets readonly scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');

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
