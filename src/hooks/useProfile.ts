import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { putPhoto, deletePhoto } from '../utils/photoStore';
import { compressImage } from '../utils/compressImage';
import { getInitials } from '../utils/formatters';
import { uploadProfilePhoto, deleteProfilePhoto } from '../lib/firebaseStorage';
import type { DayOfWeek } from '../types';
import toast from 'react-hot-toast';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Mon' }, { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' }, { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' }, { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

export function useProfile() {
  const { state, currentUser, dispatch } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [docLabel, setDocLabel] = useState('');

  const isOwnerOrPartner = currentUser?.role === 'owner' || currentUser?.role === 'partner';

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', jobTitle: '',
    hireDate: '', employeeId: '', sin: '', bankingInfo: '',
    emergencyName: '', emergencyPhone: '', emergencyRelation: '',
    tshirtSize: '', equipmentIssued: '', notes: '', performanceRating: 0,
    avatarInitials: '', avatarColor: '',
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<Record<string, string>>({});

  // Load user data into form
  useEffect(() => {
    if (!currentUser) return;
    setForm({
      name: currentUser.name, phone: currentUser.phone || '',
      email: currentUser.email || '', address: currentUser.address || '',
      jobTitle: currentUser.jobTitle || '', hireDate: currentUser.hireDate || '',
      employeeId: currentUser.employeeId || '', sin: currentUser.sin || '',
      bankingInfo: currentUser.bankingInfo || '',
      emergencyName: currentUser.emergencyName || '',
      emergencyPhone: currentUser.emergencyPhone || '',
      emergencyRelation: currentUser.emergencyRelation || '',
      tshirtSize: currentUser.tshirtSize || '',
      equipmentIssued: currentUser.equipmentIssued || '',
      notes: currentUser.notes || '',
      performanceRating: currentUser.performanceRating || 0,
      avatarInitials: currentUser.avatarInitials, avatarColor: currentUser.avatarColor,
    });
    setSkills(currentUser.skills || []);
    setAvailability(
      DAYS.reduce((acc, d) => {
        acc[d.key] = currentUser.availability?.[d.key] || 'unavailable';
        return acc;
      }, {} as Record<string, string>)
    );
    setDocuments(currentUser.documents || {});
  }, [currentUser]);

  // Profile photo URL is stored as a Firebase Storage download URL in currentUser.photoId
  useEffect(() => {
    if (!currentUser?.photoId) { setPhotoLoading(false); return; }
    setProfilePhoto(currentUser.photoId);
    setPhotoLoading(false);
  }, [currentUser?.photoId]);

  const handlePhotoUpload = useCallback(async (dataUrl: string) => {
    if (!currentUser) return;
    const compressed = await compressImage(dataUrl, 600, 0.8).catch(() => dataUrl);
    setProfilePhoto(compressed); // show preview immediately

    // Upload to Firebase Storage (cross-browser persistent)
    const downloadUrl = await uploadProfilePhoto(currentUser.id, compressed).catch((err) => {
      console.error('Failed to upload to Firebase Storage:', err);
      toast.error('Photo upload failed. Check your connection.');
      return null;
    });
    if (!downloadUrl) return;

    // Delete old IndexedDB photo if upgrading from old format
    if (currentUser.photoId && !currentUser.photoId.startsWith('http')) {
      await deletePhoto(currentUser.photoId).catch(() => {});
    }

    // Write the download URL directly to Firestore.
    // The onSnapshot listener will pick this up and dispatch SET_USERS,
    // keeping React state in sync across all browsers/tabs automatically.
    try {
      await setDoc(doc(db, 'users', currentUser.id), { photoId: downloadUrl }, { merge: true });
      toast.success('Profile photo updated');
    } catch (err) {
      console.error('Failed to save photo URL to Firestore:', err);
      toast.error('Failed to save photo. Check Firestore security rules.');
    }
  }, [currentUser]);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handlePhotoUpload(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = async () => {
    if (!currentUser?.photoId) return;
    if (currentUser.photoId.startsWith('http')) {
      await deleteProfilePhoto(currentUser.id).catch(() => {});
    } else {
      await deletePhoto(currentUser.photoId).catch(() => {});
    }
    setProfilePhoto(null);
    // Write removal directly to Firestore
    try {
      await setDoc(doc(db, 'users', currentUser.id), { photoId: null }, { merge: true });
      toast.success('Photo removed');
    } catch (err) {
      console.error('Failed to remove photo from Firestore:', err);
      toast.error('Failed to remove photo. Check Firestore security rules.');
    }
  };

  const handleDocUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !docLabel.trim()) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const label = docLabel.trim();
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string, 1200, 0.7).catch(() => reader.result as string);
      const photoId = `doc:${currentUser.id}:${label}`;
      await putPhoto(photoId, compressed);
      const updated = { ...documents, [label]: photoId };
      setDocuments(updated);
      setDocLabel('');
      dispatch({ type: 'UPDATE_USER', payload: { ...currentUser, documents: updated } });
      toast.success(`Document "${label}" saved`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [currentUser, documents, dispatch, docLabel]);

  const handleRemoveDoc = async (label: string) => {
    if (!currentUser) return;
    const photoId = documents[label];
    if (photoId) await deletePhoto(photoId).catch(() => {});
    const updated = { ...documents };
    delete updated[label];
    setDocuments(updated);
    dispatch({ type: 'UPDATE_USER', payload: { ...currentUser, documents: updated } });
    toast.success(`Document "${label}" removed`);
  };

  const toggleSkill = (skill: string) => {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const handleSave = () => {
    if (!currentUser) return;
    if (!form.name.trim()) { toast.error('Name cannot be empty'); return; }

    const avatarInitials = form.avatarInitials.length === 2 ? form.avatarInitials : getInitials(form.name);
    const availabilityRecord: Partial<Record<DayOfWeek, 'morning' | 'afternoon' | 'evening' | 'unavailable'>> = {};
    DAYS.forEach(d => {
      const val = availability[d.key];
      if (val && val !== 'unavailable') availabilityRecord[d.key] = val as any;
    });

    dispatch({
      type: 'UPDATE_USER',
      payload: {
        ...currentUser,
        name: form.name.trim(), phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined, address: form.address.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined, hireDate: form.hireDate || undefined,
        employeeId: form.employeeId.trim() || undefined, sin: form.sin.trim() || undefined,
        bankingInfo: form.bankingInfo.trim() || undefined,
        emergencyName: form.emergencyName.trim() || undefined,
        emergencyPhone: form.emergencyPhone.trim() || undefined,
        emergencyRelation: form.emergencyRelation.trim() || undefined,
        tshirtSize: form.tshirtSize || undefined,
        equipmentIssued: form.equipmentIssued.trim() || undefined,
        notes: form.notes.trim() || undefined,
        performanceRating: form.performanceRating || undefined,
        avatarInitials, avatarColor: form.avatarColor,
        skills: skills.length > 0 ? skills : undefined,
        availability: Object.keys(availabilityRecord).length > 0 ? availabilityRecord : undefined,
        documents: Object.keys(documents).length > 0 ? documents : undefined,
      }
    });
    toast.success('Profile saved');
  };

  return {
    currentUser, isOwnerOrPartner, fileInputRef, docInputRef,
    form, setForm, profilePhoto, photoLoading, skills, availability, documents,
    docLabel, setDocLabel, setAvailability, DAYS,
    handleFilePick, handleRemovePhoto, handleDocUpload, handleRemoveDoc,
    toggleSkill, handleSave,
  };
}
