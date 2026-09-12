'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import { API_URL, getErrorMessage } from '../../lib/api';
import { ConfirmationModal } from '../../components/confirmation-modal';
import {
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  Calendar,
  LogOut,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, ready, refresh, login, logout } = useAuth();

  // Account settings form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountError, setAccountError] = useState('');

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleDeleteAccount() {
    if (!token) return;
    setDeletingAccount(true);
    setDeleteError('');
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Could not delete your account'));
      }
      logout();
      router.push('/login');
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete your account');
      setDeletingAccount(false);
    }
  }

  // Initialize form fields once user is loaded
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  if (!ready) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center p-8 text-sm text-slate-500 dark:text-slate-400">
        Loading settings…
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center p-8 text-center">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d0d0d]">
          <Shield size={36} className="mx-auto text-accent-fg mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Authentication Required</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Please log in to manage your account settings and security.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  async function handleSaveAccount(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    setAccountError('');
    setAccountSuccess('');

    const cleanName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername) {
      setAccountError('Username cannot be empty.');
      return;
    }
    if (cleanUsername.length < 3) {
      setAccountError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      setAccountError('Username can only contain letters, numbers, underscores, and periods.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAccountError('Please provide a valid email address.');
      return;
    }

    setSavingAccount(true);

    try {
      const res = await fetch(`${API_URL}/auth/account`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: cleanName,
          username: cleanUsername,
          email: cleanEmail,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(getErrorMessage(payload, 'Failed to update account settings'));
      }

      // If a new access token was issued (e.g. username changed), sync the session
      if (payload.accessToken) {
        await login(payload.accessToken);
      } else {
        await refresh();
      }

      setAccountSuccess('Account settings saved successfully.');
      setTimeout(() => setAccountSuccess(''), 3500);
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Could not save account settings');
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(getErrorMessage(payload, 'Failed to change password'));
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password changed successfully.');
      setTimeout(() => setPasswordSuccess(''), 3500);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not change password');
    } finally {
      setSavingPassword(false);
    }
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  const inputClass =
    'h-10.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#151515] px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-accent focus:bg-white dark:focus:bg-[#1a1a1a] focus:ring-2 focus:ring-accent/10 transition-all';

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-[#f7f8f7] dark:bg-[#000000] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Top Header */}
        <div>
          <Link
            href={`/profile/${encodeURIComponent(user.username)}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-accent-fg transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Back to profile</span>
          </Link>
          <div className="mt-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Account Settings</span>
              <span className="rounded-full bg-accent-subtle text-accent-fg border border-accent-subtle-border px-2 py-0.5 text-[11px] font-semibold">
                Security
              </span>
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Manage your credentials, login email, username, and password security.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">

          {/* 1. Account Settings Card */}
          <section className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.08] pb-3">
                <div className="grid size-7 place-items-center rounded-lg bg-accent-subtle text-accent-fg border border-accent-subtle-border">
                  <User size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Account Credentials</h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Update your name, handle, and login email</p>
                </div>
              </div>

              {accountSuccess && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-accent-subtle border border-accent-subtle-border p-3 text-xs font-semibold text-accent-fg">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{accountSuccess}</span>
                </div>
              )}

              {accountError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{accountError}</span>
                </div>
              )}

              <form id="account-form" onSubmit={handleSaveAccount} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Talha Muammar"
                      maxLength={80}
                      className={inputClass}
                      required
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Your displayed name on your profile and posts.</p>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Username
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <span className="absolute left-3 text-sm font-semibold text-slate-400 dark:text-slate-500 select-none">
                      @
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="username"
                      minLength={3}
                      maxLength={30}
                      className={`${inputClass} pl-7 font-mono text-xs sm:text-sm`}
                      required
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Your unique URL: common-ground.app/profile/{username || 'username'}
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                      required
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Used to log in to your account. Kept private from other users.
                  </p>
                </div>
              </form>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
              <button
                type="submit"
                form="account-form"
                disabled={savingAccount}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs sm:text-sm font-semibold text-accent-text hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                <Save size={14} />
                <span>{savingAccount ? 'Saving account…' : 'Save account changes'}</span>
              </button>
            </div>
          </section>

          {/* 2. Security & Password Card */}
          <section className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.08] pb-3">
                <div className="grid size-7 place-items-center rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40">
                  <KeyRound size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Password & Security</h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Change your password to keep your account safe</p>
                </div>
              </div>

              {passwordSuccess && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-accent-subtle border border-accent-subtle-border p-3 text-xs font-semibold text-accent-fg">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form id="password-form" onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Current Password
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-10`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    New Password
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      minLength={6}
                      className={`${inputClass} pr-10`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Confirm New Password
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      minLength={6}
                      className={`${inputClass} pr-10`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
              <button
                type="submit"
                form="password-form"
                disabled={savingPassword}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#151515] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:border-slate-400 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Lock size={14} />
                <span>{savingPassword ? 'Updating password…' : 'Update password'}</span>
              </button>
            </div>
          </section>

        </div>

        {/* 3. Account Details & Session Card */}
        <section className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Account created in {memberSince}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  User ID: #{user.id} · Connected to Common Ground network
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 px-3.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </section>

        {/* 4. Danger Zone - Delete Account */}
        <section className="rounded-2xl border border-rose-200/90 dark:border-rose-950/60 bg-rose-50/25 dark:bg-rose-950/10 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle size={16} />
                <span>Delete Account</span>
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Permanently delete your account, posts, comments, likes, friendships, bookmarks, and all associated data from the database. This action is irreversible.
              </p>
              {deleteError && (
                <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle size={13} />
                  <span>{deleteError}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setDeleteError('');
                setShowDeleteModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0 active:scale-[0.98]"
            >
              <Trash2 size={14} />
              <span>Delete Account</span>
            </button>
          </div>
        </section>

      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete account permanently?"
        message={`Are you sure you want to delete your account (@${user.username})? This will permanently erase your profile, posts, comments, reactions, bookmarks, and all personal data from the database. This action cannot be undone.`}
        confirmText="Yes, delete my account"
        cancelText="Keep my account"
        isDestructive={true}
        isLoading={deletingAccount}
        onConfirm={handleDeleteAccount}
        onCancel={() => {
          if (!deletingAccount) {
            setShowDeleteModal(false);
            setDeleteError('');
          }
        }}
      />
    </div>
  );
}
