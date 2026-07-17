import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { compressImage } from '../utils/compressImage';
import { getInitials } from '../utils/formatters';
import { saveProfilePhoto, removeProfilePhoto } from '../lib/firebaseStorage';
import type { DayOfWeek, AvailabilitySlot } from '../types';
import toast from 'react-hot-toast';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Mon' }, { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' }, { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' }, { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

// Default availability for a day: 9-to-5
const DEFAULT_SLOT: AvailabilitySlot = { start: '09:00', end: '17:00' };

export function useProfile() {
  const { currentUser, dispatch } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [optimisticPhotoUrl, setOptimisticPhotoUrl] = useState<string | undefined>(undefined);
  const profilePhoto = optimisticPhotoUrl !== undefined ? optimisticPhotoUrl : (currentUser?.photoData ?? null);
  const photoLoading = false;
  const [docLabel, setDocLabel] = useState('');

  const isOwnerOrPartner = currentUser?.role === 'owner' || currentUser?.role === 'partner';

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', dateOfBirth: '',
    jobTitle: '', hireDate: '', employeeId: '', sin: '', bankingInfo: '',
    emergencyName: '', emergencyPhone: '', emergencyRelation: '',
    tshirtSize: '', equipmentIssued: '', notes: '',
    driversLicense: '', vehicleInfo: '',
    avatarInitials: '', avatarColor: '',
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  // Each day maps to an AvailabilitySlot | null (null = unavailable)
  const [availability, setAvailability] = useState<Record<string, AvailabilitySlot | null>>({});
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
      dateOfBirth: currentUser.dateOfBirth || '',
      jobTitle: currentUser.jobTitle || '', hireDate: currentUser.hireDate || '',
      employeeId: currentUser.employeeId || '', sin: currentUser.sin || '',
      bankingInfo: currentUser.bankingInfo || '',
      emergencyName: currentUser.emergencyName || '',
      emergencyPhone: currentUser.emergencyPhone || '',
      emergencyRelation: currentUser.emergencyRelation || '',
      tshirtSize: currentUser.tshirtSize || '',
      equipmentIssued: currentUser.equipmentIssued || '',
      notes: currentUser.notes || '',
      driversLicense: currentUser.driversLicense || '',
      vehicleInfo: currentUser.vehicleInfo || '',
      avatarInitials: currentUser.avatarInitials, avatarColor: currentUser.avatarColor,
    });
    setSkills(currentUser.skills || []);
    setLanguages(currentUser.languages || []);
    setAvailability(
      DAYS.reduce((acc, d) => {
        const slot = currentUser.availability?.[d.key];
        // Convert old-format string values ("morning"/"afternoon"/"evening") to new AvailabilitySlot
        if (typeof slot === 'string') {
          acc[d.key] = { start: '09:00', end: '17:00' };
        } else {
          acc[d.key] = slot ?? null;
        }
        return acc;
      }, {} as Record<string, AvailabilitySlot | null>)
    );
    setDocuments(currentUser.documents || {});
  }, [currentUser]);

  // Profile photo is derived from currentUser + optimistic state.
  // The optimisticPhotoUrl covers the gap between user action and Firestore sync.
  // When Firestore syncs, currentUser.photoData is updated and matches the optimistic value.

  const handlePhotoUpload = useCallback(async (dataUrl: string) => {
    if (!currentUser) return;
    const compressed = await compressImage(dataUrl, 600, 0.8).catch(() => dataUrl);
    setOptimisticPhotoUrl(compressed); // show preview immediately

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
    setOptimisticPhotoUrl(undefined);
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
      const raw = reader.result as string;
      // Compress images, store other files as-is (PDF, DOCX, etc.)
      const stored = file.type.startsWith('image/')
        ? await compressImage(raw, 1200, 0.7).catch(() => raw)
        : raw;
      // Store the data URL directly so it syncs to Firestore and is
      // accessible cross-device (owners can view employee docs).
      const updated = { ...documents, [label]: stored };
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
    const availabilityRecord: Partial<Record<DayOfWeek, AvailabilitySlot>> = {};
    DAYS.forEach(d => {
      const val = availability[d.key];
      // Include all 7 day keys — null/undefined means "unavailable" and
      // will become null in Firestore via sanitizeForFirestore, clearing
      // the old value during the merge. Omitting the key would leave the
      // stale value in place.
      availabilityRecord[d.key] = val ?? undefined;
    });

    // Destructure photoData so it's NOT included in the UPDATE_USER payload.
    // Photo is managed by saveProfilePhoto() directly — including it here
    // would nullify it if the Firestore onSnapshot hasn't synced the new
    // photoData into currentUser yet (race condition).
    const { photoData, ...userForSave } = currentUser;
    void photoData;

    dispatch({
      type: 'UPDATE_USER',
      payload: {
        ...userForSave,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
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
        driversLicense: form.driversLicense.trim() || undefined,
        vehicleInfo: form.vehicleInfo.trim() || undefined,
        avatarInitials, avatarColor: form.avatarColor,
        skills: skills.length > 0 ? skills : undefined,
        languages: languages.length > 0 ? languages : undefined,
        availability: Object.keys(availabilityRecord).length > 0 ? availabilityRecord : undefined,
        documents: Object.keys(documents).length > 0 ? documents : undefined,
      }
    });
    toast.success('Profile saved');
  };

  return {
    currentUser, isOwnerOrPartner, fileInputRef, docInputRef,
    form, setForm, profilePhoto, photoLoading, skills, languages, availability, documents,
    docLabel, setDocLabel, setAvailability, setLanguages, DAYS, DEFAULT_SLOT,
    handleFilePick, handleRemovePhoto, handleDocUpload, handleRemoveDoc,
    toggleSkill, handleSave,
  };
}
