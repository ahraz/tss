// ============================================================
// GTA Scrub — Photo helpers (Firestore-only, no Storage needed)
// ============================================================

import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Store a compressed profile photo data URL directly in Firestore.
 * The onSnapshot listener picks this up and displays it in any browser.
 *
 * Firestore document limit is 1MB — a compressed 600px profile photo
 * is ~50-200KB, well within bounds.
 */
export async function saveProfilePhoto(userId: string, dataUrl: string): Promise<void> {
  await setDoc(doc(db, 'users', userId), { photoData: dataUrl }, { merge: true });
}

export async function removeProfilePhoto(userId: string): Promise<void> {
  await setDoc(doc(db, 'users', userId), { photoData: null }, { merge: true });
}
