import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Lock,
  Unlock,
  ShieldCheck,
  Check,
  Trash2,
  AlertCircle,
  Briefcase,
  Home,
  PiggyBank,
  FolderGit2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Profile } from '../../types';
import { useLedger } from '../../context/LedgerContext';
import { api } from '../../api/client';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Profile | null;
}

const COLOR_PALETTE = [
  { hex: '#1A1A1A', name: 'Onyx' },
  { hex: '#C9A24B', name: 'Gold' },
  { hex: '#15803D', name: 'Emerald' },
  { hex: '#1D4ED8', name: 'Sapphire' },
  { hex: '#B91C1C', name: 'Crimson' },
  { hex: '#7C3AED', name: 'Violet' },
  { hex: '#0F766E', name: 'Teal' },
  { hex: '#EA580C', name: 'Terracotta' },
];

const PROFILE_TYPES = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'business', label: 'Business / Freelance', icon: Briefcase },
  { id: 'family', label: 'Family Member', icon: Home },
  { id: 'savings', label: 'Savings Vault', icon: PiggyBank },
  { id: 'project', label: 'Project / Venture', icon: FolderGit2 },
];

const CURRENCIES = [
  { code: 'GHS', label: 'GHS (Ghana Cedi)' },
  { code: 'USD', label: 'USD (US Dollar)' },
  { code: 'EUR', label: 'EUR (Euro)' },
  { code: 'GBP', label: 'GBP (British Pound)' },
  { code: 'NGN', label: 'NGN (Nigerian Naira)' },
  { code: 'CAD', label: 'CAD (Canadian Dollar)' },
  { code: 'AUD', label: 'AUD (Australian Dollar)' },
  { code: 'KES', label: 'KES (Kenyan Shilling)' },
  { code: 'ZAR', label: 'ZAR (South African Rand)' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { profiles, fetchProfiles, setActiveProfileId, notify } = useLedger();

  const [name, setName] = useState('');
  const [type, setType] = useState('personal');
  const [color, setColor] = useState('#1A1A1A');
  const [currency, setCurrency] = useState('GHS');

  // Lock & PIN states
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [pinAction, setPinAction] = useState<'keep' | 'change' | 'remove'>('keep');
  const [showPin, setShowPin] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type || 'personal');
      setColor(initialData.color || '#1A1A1A');
      setCurrency(initialData.displayCurrency || 'GHS');
      setIsLocked(Boolean(initialData.isLocked));
      setPinAction('keep');
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
    } else {
      setName('');
      setType('personal');
      setColor('#1A1A1A');
      setCurrency('GHS');
      setIsLocked(false);
      setPinAction('keep');
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
    }
    setError('');
    setShowDeleteConfirm(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Profile name is required');
      return;
    }

    // Validation for new lock
    if (!initialData || !initialData.isLocked) {
      if (isLocked) {
        if (!pin || pin.length < 4) {
          setError('Security PIN must be at least 4 digits');
          return;
        }
        if (pin !== confirmPin) {
          setError('PIN and confirmation PIN do not match');
          return;
        }
      }
    } else {
      // Modifying an already locked profile
      if (pinAction === 'remove') {
        if (!currentPin) {
          setError('Current PIN is required to unlock this profile');
          return;
        }
      } else if (pinAction === 'change') {
        if (!currentPin) {
          setError('Current PIN is required');
          return;
        }
        if (!pin || pin.length < 4) {
          setError('New PIN must be at least 4 digits');
          return;
        }
        if (pin !== confirmPin) {
          setError('New PIN and confirmation PIN do not match');
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      if (initialData) {
        // Update existing profile
        const payload: any = {
          name: trimmedName,
          type,
          color,
          displayCurrency: currency,
        };

        if (initialData.isLocked) {
          if (pinAction === 'remove') {
            payload.isLocked = false;
            payload.currentPin = currentPin;
          } else if (pinAction === 'change') {
            payload.isLocked = true;
            payload.currentPin = currentPin;
            payload.newPin = pin;
          }
        } else if (isLocked) {
          payload.isLocked = true;
          payload.pin = pin;
        }

        await api.updateProfile(initialData.id, payload);
        await fetchProfiles();
        notify(`Profile "${trimmedName}" updated successfully`);
      } else {
        // Create new profile
        const newProf = await api.createProfile({
          name: trimmedName,
          type,
          color,
          displayCurrency: currency,
          isLocked,
          pin: isLocked ? pin : undefined,
        });

        await fetchProfiles();
        setActiveProfileId(newProf.id);
        notify(
          isLocked
            ? `Protected profile "${trimmedName}" created with PIN`
            : `Profile "${trimmedName}" created successfully`
        );
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData) return;
    if (profiles.length <= 1) {
      setError('Cannot delete the only remaining profile.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.deleteProfile(initialData.id);
      await fetchProfiles();
      notify(`Profile "${initialData.name}" was deleted`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0 bg-surface">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
              style={{ backgroundColor: color }}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="t-card">
                {initialData ? 'Edit Profile & Security' : 'Create New Profile'}
              </h2>
              <span className="t-meta num block">
                {initialData
                  ? 'Manage identity, base currency, and PIN lock'
                  : 'Add an independent financial space to your ledger'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg-iconbtn"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {error && (
            <div className="p-3 bg-neg-soft border border-neg-soft rounded-xl flex items-start gap-2.5 text-xs text-neg font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Profile Name & Category */}
          <div className="space-y-3">
            <div>
              <label className="block t-eyebrow mb-1">
                Profile Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Personal, Family, Consulting LLC, Travel Fund"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-sunken text-ink px-3.5 py-2.5 rounded-xl border border-line text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block t-eyebrow mb-1.5">
                Entity Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROFILE_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-solid text-on-solid border-line-strong shadow-xs'
                          : 'bg-surface text-ink-2 border-line hover:border-line-strong'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Color and Currency in 2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Color Swatches */}
            <div>
              <label className="block t-eyebrow mb-1.5">
                Color Accent
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 border border-line shadow-xs cursor-pointer"
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {color === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Display Currency */}
            <div>
              <label className="block t-eyebrow mb-1.5">
                Base Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-sunken text-ink px-3 py-2.5 rounded-xl border border-line text-sm num font-semibold focus:outline-none focus:border-accent"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Security & Lock Section */}
          <div className="border border-line bg-sunken rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${isLocked ? 'bg-amber-500/10 text-warn border border-warn/20' : 'bg-surface text-ink-3 border border-line'}`}>
                  {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </div>
                <div>
                  <span className="t-card block">
                    Profile Security Lock
                  </span>
                  <span className="t-meta num block">
                    Require PIN to view transactions & accounts
                  </span>
                </div>
              </div>

              {!initialData?.isLocked && (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLocked}
                    onChange={(e) => setIsLocked(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-solid"></div>
                </label>
              )}
            </div>

            {/* Case A: Creating a new profile with Lock, or locking an unlocked profile */}
            {isLocked && (!initialData || !initialData.isLocked) && (
              <div className="space-y-2.5 pt-3 border-t border-line animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="t-eyebrow">
                    Profile Security Passcode
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center gap-1 t-meta text-ink-2 hover:text-ink cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPin ? 'Hide PIN' : 'View PIN'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block t-eyebrow mb-1">
                      Set 4-6 Digit PIN *
                    </label>
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-surface text-ink px-3 py-2 rounded-xl border border-line text-sm tracking-widest num font-bold focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block t-eyebrow mb-1">
                      Confirm PIN *
                    </label>
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="••••"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-surface text-ink px-3 py-2 rounded-xl border border-line text-sm tracking-widest num font-bold focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <p className="t-meta num">
                  Anyone switching into this profile will be prompted for this PIN.
                </p>
              </div>
            )}

            {/* Case B: Editing an already locked profile */}
            {initialData && initialData.isLocked && (
              <div className="space-y-3 pt-3 border-t border-line">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPinAction('keep')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        pinAction === 'keep'
                          ? 'bg-solid text-on-solid border-line-strong'
                          : 'bg-surface text-ink-2 border-line hover:border-line-strong'
                      }`}
                    >
                      Keep Current PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setPinAction('change')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        pinAction === 'change'
                          ? 'bg-solid text-on-solid border-line-strong'
                          : 'bg-surface text-ink-2 border-line hover:border-line-strong'
                      }`}
                    >
                      Change PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setPinAction('remove')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        pinAction === 'remove'
                          ? 'bg-neg text-white border-neg'
                          : 'bg-surface text-neg border-neg-soft hover:bg-neg-soft'
                      }`}
                    >
                      Remove Lock
                    </button>
                  </div>
                  {pinAction !== 'keep' && (
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="flex items-center gap-1 t-meta text-ink-2 hover:text-ink cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPin ? 'Hide' : 'View'}</span>
                    </button>
                  )}
                </div>

                {pinAction === 'remove' && (
                  <div className="p-3 bg-surface rounded-xl border border-neg-soft space-y-2 animate-in fade-in duration-150">
                    <label className="block t-eyebrow text-neg">
                      Enter Current PIN to Unlock
                    </label>
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="••••"
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-sunken text-ink px-3 py-2 rounded-xl border border-neg-soft text-sm tracking-widest num font-bold focus:outline-none"
                    />
                    <p className="t-meta">
                      Removing the lock allows anyone to view this profile without a PIN.
                    </p>
                  </div>
                )}

                {pinAction === 'change' && (
                  <div className="p-3 bg-surface rounded-xl border border-line space-y-2.5 animate-in fade-in duration-150">
                    <div>
                      <label className="block t-eyebrow mb-1">
                        Current PIN *
                      </label>
                      <input
                        type={showPin ? 'text' : 'password'}
                        maxLength={6}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        placeholder="••••"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-sunken text-ink px-3 py-2 rounded-xl border border-line text-sm tracking-widest num font-bold focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block t-eyebrow mb-1">
                          New PIN *
                        </label>
                        <input
                          type={showPin ? 'text' : 'password'}
                          maxLength={6}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          placeholder="••••"
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-sunken text-ink px-3 py-2 rounded-xl border border-line text-sm tracking-widest num font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block t-eyebrow mb-1">
                          Confirm New PIN *
                        </label>
                        <input
                          type={showPin ? 'text' : 'password'}
                          maxLength={6}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          placeholder="••••"
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-sunken text-ink px-3 py-2 rounded-xl border border-line text-sm tracking-widest num font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delete confirmation section if editing and more than 1 profile */}
          {initialData && profiles.length > 1 && (
            <div className="pt-2">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-neg hover:underline flex items-center gap-1.5 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete this profile...</span>
                </button>
              ) : (
                <div className="p-3.5 bg-neg-soft border border-neg-soft rounded-xl space-y-2.5">
                  <p className="text-xs text-neg font-medium leading-relaxed">
                    Are you sure you want to delete &quot;{initialData.name}&quot;? All associated transactions, goals, and budgets will be permanently removed.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="lg-btn lg-btn-danger lg-btn-sm disabled:opacity-50"
                    >
                      Yes, Delete Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="lg-btn lg-btn-quiet lg-btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="lg-btn lg-btn-quiet lg-btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="lg-btn lg-btn-solid lg-btn-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{initialData ? 'Save Changes' : 'Create Profile'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
