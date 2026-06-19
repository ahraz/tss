import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { compressImage } from '../utils/compressImage';
import { getInitials } from '../utils/formatters';
import { saveProfilePhoto, removeProfilePhoto } from '../lib/firebaseStorage';
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

  // Load user data into form — only when the user identity changes, not on
  // every data sync. Otherwise uploading a doc (which dispatches UPDATE_USER
  // and updates currentUser) would wipe any in-progress form edits.
  const loadedUserId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentUser) return;
    if (loadedUserId.current === currentUser.id) return;
    loadedUserId.current = currentUser.id;
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

  // Profile photo data is stored directly in Firestore (photoData field)
  // so it works cross-browser without needing Firebase Storage.
  useEffect(() => {
    if (!currentUser?.photoData) { setPhotoLoading(false); return; }
    setProfilePhoto(currentUser.photoData);
    setPhotoLoading(false);
  }, [currentUser?.photoData]);

  const handlePhotoUpload = useCallback(async (dataUrl: string) => {
    if (!currentUser) return;
    const compressed = await compressImage(dataUrl, 600, 0.8).catch(() => dataUrl);
    setProfilePhoto(compressed); // show preview immediately

    // Save photo data directly in Firestore (free Spark plan).
    // The onSnapshot listener picks this up and updates state in all browsers.
    try {
      await saveProfilePhoto(currentUser.id, compressed);
      toast.success('Profile photo updated');
    } catch (err) {
      console.error('Failed to save photo to Firestore:', err);
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
    if (!currentUser) return;
    setProfilePhoto(null);
    try {
      await removeProfilePhoto(currentUser.id);
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
      // Store the data URL directly so it syncs to Firestore and is
      // accessible cross-device (owners can view employee docs).
      const updated = { ...documents, [label]: compressed };
      setDocuments(updated);
      setDocLabel('');
      // Only send the documents field to avoid overwriting other
      // user data that may have changed since this callback captured currentUser.
      dispatch({ type: 'UPDATE_USER', payload: { id: currentUser.id, documents: updated } });
      toast.success(`Document "${label}" saved`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [currentUser, documents, dispatch, docLabel]);

  const handleRemoveDoc = async (label: string) => {
    if (!currentUser) return;
    const updated = { ...documents };
    delete updated[label];
    setDocuments(updated);
    dispatch({ type: 'UPDATE_USER', payload: { id: currentUser.id, documents: updated } });
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

    // Destructure photoData so it's NOT included in the UPDATE_USER payload.
    // Photo is managed by saveProfilePhoto() directly — including it here
    // would nullify it if the Firestore onSnapshot hasn't synced the new
    // photoData into currentUser yet (race condition).
    const { photoData: _, ...userForSave } = currentUser;

    dispatch({
      type: 'UPDATE_USER',
      payload: {
        ...userForSave,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined,
        hireDate: form.hireDate || undefined,
        employeeId: form.employeeId.trim() || undefined,
        sin: form.sin.trim() || undefined,
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
