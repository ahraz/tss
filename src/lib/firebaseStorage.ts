// ============================================================
// TSS Cleaners — Firebase Storage for photos
// ============================================================

import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import app from './firebase';

const auth = getAuth(app);

let authPromise: Promise<void> | null = null;

/** Ensure we're authenticated anonymously before touching Storage. */
async function ensureAuth(): Promise<void> {
  if (auth.currentUser) return;
  if (authPromise) return authPromise;
  authPromise = signInAnonymously(auth).then(() => {}).catch((err) => {
    authPromise = null;
    throw err;
  });
  return authPromise;
}

const storage = getStorage(app);

/**
 * Upload a profile photo (data URL) and return the download URL.
 * Replaces any existing photo at the same path.
 */
export async function uploadProfilePhoto(userId: string, dataUrl: string): Promise<string> {
  await ensureAuth();
  const photoRef = ref(storage, `profiles/${userId}`);
  await uploadString(photoRef, dataUrl, 'data_url');
  return getDownloadURL(photoRef);
}

/**
 * Delete a profile photo from Firebase Storage.
 */
export async function deleteProfilePhoto(userId: string): Promise<void> {
  await ensureAuth();
  const photoRef = ref(storage, `profiles/${userId}`);
  try {
    await deleteObject(photoRef);
  } catch {
    // Ignore if file doesn't exist
  }
}
