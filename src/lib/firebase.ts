import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyClhLy1NtGRGCk70-6XcECbkzT86DgEao0",
  authDomain: "tssc-4d214.firebaseapp.com",
  projectId: "tssc-4d214",
  storageBucket: "tssc-4d214.firebasestorage.app",
  messagingSenderId: "273683125527",
  appId: "1:273683125527:web:b11916b9d9bd10325e9352",
  measurementId: "G-M0HRSZ5H4S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with long-polling for broader network compatibility
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export default app;
