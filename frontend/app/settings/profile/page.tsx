'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { UserAvatar } from '../../../components/user-avatar';
import { LocationMapPicker } from '../../../components/location-map-picker';
import { API_URL, getErrorMessage, mediaUrl } from '../../../lib/api';
import {
  WorkItem, EducationItem, parseWorkItems, parseEducationItems,
  serializeWorkItems, serializeEducationItems, formatWorkText, formatEducationText
} from '../../../lib/work-study';
import { Briefcase, GraduationCap, Globe, MessageSquare, MapPin, Home, User, AtSign, Plus, Trash2, Save } from 'lucide-react';

type UploadKind = 'avatar' | 'cover';

export default function EditProfilePage() {
  const { user, token, ready, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Location and map coordinates state
  const [locationStr, setLocationStr] = useState(user?.location || '');
  const [locationLat, setLocationLat] = useState<number | null>(user?.locationLat ?? null);
  const [locationLng, setLocationLng] = useState<number | null>(user?.locationLng ?? null);

  // Hometown and map coordinates state
  const [hometownStr, setHometownStr] = useState(user?.hometown || '');
  const [hometownLat, setHometownLat] = useState<number | null>(user?.hometownLat ?? null);
  const [hometownLng, setHometownLng] = useState<number | null>(user?.hometownLng ?? null);

  // Work and Education multiple items state
  const [workItems, setWorkItems] = useState<WorkItem[]>(() => parseWorkItems(user?.work));
  const [educationItems, setEducationItems] = useState<EducationItem[]>(() => parseEducationItems(user?.education));

  function addWorkItem() {
    setWorkItems((prev) => [
      ...prev,
      { id: `work-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: '', isCurrent: true },
    ]);
  }

  function updateWorkItem(index: number, updates: Partial<WorkItem>) {
    setWorkItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  }

  function removeWorkItem(index: number) {
    setWorkItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addEducationItem() {
    setEducationItems((prev) => [
      ...prev,
      { id: `edu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: '', isCurrent: false },
    ]);
  }

  function updateEducationItem(index: number, updates: Partial<EducationItem>) {
    setEducationItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  }

  function removeEducationItem(index: number) {
    setEducationItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user) return;
    setSaving(true);
    setError('');
    setMessage('');
    const data = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(data.entries());

    // Inject location coordinates
    body.location = locationStr;
    body.locationLat = locationLat;
    body.locationLng = locationLng;

    // Inject hometown coordinates
    body.hometown = hometownStr;
    body.hometownLat = hometownLat;
    body.hometownLng = hometownLng;

    // Inject serialized multiple work & education items
    body.work = serializeWorkItems(workItems);
    body.education = serializeEducationItems(educationItems);

    // Normalize website: accept www. or plain domain without http
    if (typeof body.website === 'string') {
      const trimmed = body.website.trim();
      body.website = trimmed ? (/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`) : null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload, 'Could not update your profile'));
      await refresh();
      setMessage('Profile updated successfully.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update your profile');
    } finally {
      setSaving(false);
    }
  }

  async function upload(kind: UploadKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !token) return;
    if (file.size > 5 * 1024 * 1024) { setError('Images must be 5 MB or smaller.'); return; }
    setUploading(kind);
    setError('');
    setMessage('');
    const formData = new FormData();
    formData.append(kind, file);
    try {
      const response = await fetch(`${API_URL}/auth/me/${kind}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload, `Could not update your ${kind === 'avatar' ? 'profile picture' : 'cover photo'}`));
      await refresh();
      setMessage(`${kind === 'avatar' ? 'Profile picture' : 'Cover photo'} updated.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not upload the image');
    } finally {
      setUploading(null);
    }
  }

  if (!ready) return <div className="p-8 text-sm text-muted dark:text-slate-400">Loading settings…</div>;
  if (!token || !user) return (
    <div className="p-8">
      <p className="text-sm text-muted dark:text-slate-400">Log in to edit your profile.</p>
      <Link href="/login" className="mt-4 inline-flex font-semibold text-accent-fg hover:underline">Log in</Link>
    </div>
  );

  const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#151515] px-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors';
  const cover = mediaUrl(user.coverUrl);

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-[#f7f8f7] dark:bg-[#000000] p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href={`/profile/${encodeURIComponent(user.username)}`} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-accent-fg">
            ← Back to profile
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Edit profile</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your comprehensive personal, professional, and map location information.</p>
        </div>
      </div>


      {(message || error) && (
        <p className={`mb-5 rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 border border-red-200 dark:border-rose-900/50' : 'bg-accent-subtle text-accent-fg border border-accent-subtle-border'}`} role="status">
          {error || message}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={save} className="space-y-6">
          {/* 1. Basic Information Section */}
          <section className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 sm:p-7 shadow-xs">
            <div className="mb-5 flex items-center gap-2 border-b border-zinc-100 dark:border-white/[0.08] pb-3">
              <User size={16} className="text-accent-fg" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Basic Information</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                Display name *
                <input className={inputClass} name="fullName" defaultValue={user.fullName || ''} minLength={2} maxLength={80} required />
              </label>

              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pronouns
                <input className={inputClass} name="pronouns" defaultValue={user.pronouns || ''} maxLength={60} placeholder="e.g. he/him, she/her, they/them" />
              </label>

              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Relationship Status
                <select name="relationship" defaultValue={user.relationship || ''} className={inputClass}>
                  <option value="">Select status</option>
                  <option value="Single">Single</option>
                  <option value="In a relationship">In a relationship</option>
                  <option value="Engaged">Engaged</option>
                  <option value="Married">Married</option>
                  <option value="It's complicated">It&apos;s complicated</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </label>
            </div>
          </section>

          {/* 2. Bio Section */}
          <section className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 sm:p-7 shadow-xs">
            <div className="mb-5 flex items-center gap-2 border-b border-zinc-100 dark:border-white/[0.08] pb-3">
              <MessageSquare size={16} className="text-accent-fg" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">About & Bio</h2>
            </div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Biography
              <textarea
                className="mt-1.5 min-h-32 w-full resize-y rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#151515] p-4 text-sm text-slate-900 dark:text-slate-100 leading-6 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                name="bio"
                defaultValue={user.bio || ''}
                maxLength={500}
                placeholder="Share your story, values, passions, or whatever brings you to Common Ground..."
              />
              <span className="mt-1.5 block text-[11px] font-normal text-slate-400 dark:text-slate-500">Up to 500 characters</span>
            </label>
          </section>

          {/* 3. Work & Education Section with Multiple Items & Current/Past Marks */}
          <section className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 sm:p-7 shadow-xs space-y-6">
            <div className="border-b border-zinc-100 dark:border-white/[0.08] pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-accent-fg" />
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">Work & Education</h2>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">Multiple positions & schools</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Add multiple work experiences and schools. Check the box if you currently work or study there (displays as &quot;Works at&quot; / &quot;Studies at&quot; or past tense &quot;Worked at&quot; / &quot;Studied at&quot;).
              </p>
            </div>

            {/* Work Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-accent-fg" />
                  <span>Work Experience</span>
                  <span className="text-slate-400 font-normal">({workItems.length})</span>
                </label>
                <button
                  type="button"
                  onClick={addWorkItem}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-fg hover:underline cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Work</span>
                </button>
              </div>

              {workItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/10 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No work experience added yet.</p>
                  <button
                    type="button"
                    onClick={addWorkItem}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-accent-fg hover:underline cursor-pointer"
                  >
                    <Plus size={13} /> Add company or position
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {workItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#151515] p-3.5 space-y-2.5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateWorkItem(index, { name: e.target.value })}
                          placeholder="e.g. Lead Full-Stack Architect at Ultranet Labs"
                          className="flex-1 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#181818] px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                        />
                        <button
                          type="button"
                          onClick={() => removeWorkItem(index)}
                          className="grid size-9 place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                          title="Remove this work experience"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Currently working toggle mark */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.isCurrent}
                            onChange={(e) => updateWorkItem(index, { isCurrent: e.target.checked })}
                            className="size-4 rounded border-zinc-300 text-accent focus:ring-accent cursor-pointer accent-accent"
                          />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Currently work here
                          </span>
                        </label>

                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            item.isCurrent
                              ? 'bg-accent-subtle text-accent-fg border-accent-subtle-border'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800/60 dark:text-slate-400 dark:border-white/10'
                          }`}
                        >
                          {item.isCurrent ? 'Present ("Works at")' : 'Past ("Worked at")'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Education Items */}
            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-white/[0.08]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <GraduationCap size={15} className="text-accent-fg" />
                  <span>Education & Studies</span>
                  <span className="text-slate-400 font-normal">({educationItems.length})</span>
                </label>
                <button
                  type="button"
                  onClick={addEducationItem}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-fg hover:underline cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Study</span>
                </button>
              </div>

              {educationItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/10 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No education/studies added yet.</p>
                  <button
                    type="button"
                    onClick={addEducationItem}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-accent-fg hover:underline cursor-pointer"
                  >
                    <Plus size={13} /> Add school or university
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {educationItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#151515] p-3.5 space-y-2.5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateEducationItem(index, { name: e.target.value })}
                          placeholder="e.g. Computer Science, Stanford University"
                          className="flex-1 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#181818] px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                        />
                        <button
                          type="button"
                          onClick={() => removeEducationItem(index)}
                          className="grid size-9 place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                          title="Remove this study/education"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Currently studying toggle mark */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.isCurrent}
                            onChange={(e) => updateEducationItem(index, { isCurrent: e.target.checked })}
                            className="size-4 rounded border-zinc-300 text-accent focus:ring-accent cursor-pointer accent-accent"
                          />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Currently study here
                          </span>
                        </label>

                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            item.isCurrent
                              ? 'bg-accent-subtle text-accent-fg border-accent-subtle-border'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800/60 dark:text-slate-400 dark:border-white/10'
                          }`}
                        >
                          {item.isCurrent ? 'Present ("Studies at")' : 'Past ("Studied at")'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 4. Places & Interactive Map Location Section */}
          <section className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 sm:p-7 shadow-xs">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-100 dark:border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-accent-fg" />
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">Places & Map Location</h2>
              </div>
              <span className="text-[11px] font-medium text-accent-fg">Interactive Map</span>
            </div>

            <div className="space-y-7">
              {/* Current Living Location */}
              <div>
                <LocationMapPicker
                  location={locationStr}
                  lat={locationLat}
                  lng={locationLng}
                  label="Current Living Location (City, Region, Country)"
                  placeholder="Search current city or pin on map..."
                  icon="pin"
                  themeColor="emerald"
                  onChange={(newLoc, newLat, newLng) => {
                    setLocationStr(newLoc);
                    setLocationLat(newLat);
                    setLocationLng(newLng);
                  }}
                />
              </div>

              {/* Hometown / Place of Origin */}
              <div className="pt-4 border-t border-zinc-100 dark:border-white/[0.08]">
                <LocationMapPicker
                  location={hometownStr}
                  lat={hometownLat}
                  lng={hometownLng}
                  label="Hometown / Place of Origin"
                  placeholder="Search your hometown or pin on map..."
                  icon="home"
                  themeColor="amber"
                  onChange={(newLoc, newLat, newLng) => {
                    setHometownStr(newLoc);
                    setHometownLat(newLat);
                    setHometownLng(newLng);
                  }}
                />
              </div>
            </div>
          </section>

          {/* 5. Personal Details, Interests & Languages */}
          <section className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 sm:p-7 shadow-xs">
            <div className="mb-5 flex items-center gap-2 border-b border-zinc-100 dark:border-white/[0.08] pb-3">
              <Globe size={16} className="text-accent-fg" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Interests & Languages</h2>
            </div>
            <div className="grid gap-5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Interests & Hobbies (Comma separated)
                <input className={inputClass} name="interests" defaultValue={user.interests || ''} maxLength={300} placeholder="e.g. Photography, Hiking, Open Source, UI Design, Cycling, Coffee" />
                <span className="mt-1 block text-[11px] font-normal text-slate-400 dark:text-slate-500">Will be displayed as interactive tags on your profile.</span>
              </label>

              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Languages Spoken (Comma separated)
                <input className={inputClass} name="languages" defaultValue={user.languages || ''} maxLength={200} placeholder="e.g. English, Spanish, French, Japanese" />
              </label>
            </div>
          </section>

          {/* 6. Social Presence & Web Links */}
          <section className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 sm:p-7 shadow-xs">
            <div className="mb-5 flex items-center gap-2 border-b border-zinc-100 dark:border-white/[0.08] pb-3">
              <AtSign size={16} className="text-accent-fg" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Social Links & Websites</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                Personal Website
                <input className={inputClass} name="website" defaultValue={user.website || ''} maxLength={150} placeholder="www.yourwebsite.com or https://..." />
              </label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                GitHub Username
                <input className={inputClass} name="github" defaultValue={user.github || ''} maxLength={50} placeholder="username" />
              </label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Twitter / X Username
                <input className={inputClass} name="twitter" defaultValue={user.twitter || ''} maxLength={50} placeholder="username" />
              </label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                LinkedIn Profile / Username
                <input className={inputClass} name="linkedin" defaultValue={user.linkedin || ''} maxLength={80} placeholder="username or link" />
              </label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Instagram Username
                <input className={inputClass} name="instagram" defaultValue={user.instagram || ''} maxLength={50} placeholder="username" />
              </label>
            </div>
          </section>

          {/* Submit Button Bar */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-sm font-semibold text-accent-text shadow-sm hover:bg-accent-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />
              <span>{saving ? 'Saving changes…' : 'Save Changes'}</span>
            </button>
            <Link
              href={`/profile/${encodeURIComponent(user.username)}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 dark:border-white/10 px-5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel & View Profile
            </Link>
          </div>
        </form>

        {/* Live Preview Sidebar Card */}
        <aside className="space-y-6">
          <section className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] overflow-hidden shadow-xs">
            <div className="relative h-24 overflow-hidden bg-gradient-to-r from-accent to-accent-hover">
              {cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="Your cover" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="px-5 pb-5">
              <div className="-mt-10">
                <UserAvatar
                  src={user.avatarUrl}
                  name={user.fullName || user.username}
                  className="size-20 rounded-full border-4 border-white dark:border-[#0d0d0d] bg-slate-100 dark:bg-[#151515] text-2xl font-semibold text-slate-700 dark:text-slate-200 shadow-md"
                />
              </div>
              {workItems.length > 0 && (
                <div className="mt-2 space-y-1">
                  {workItems.slice(0, 2).map((item, idx) => (
                    <p key={`preview-work-${idx}`} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <Briefcase size={12} className="text-accent-fg shrink-0" />
                      <span className="truncate">{formatWorkText(item)}</span>
                    </p>
                  ))}
                </div>
              )}
              {educationItems.length > 0 && (
                <div className="mt-1 space-y-1">
                  {educationItems.slice(0, 2).map((item, idx) => (
                    <p key={`preview-edu-${idx}`} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <GraduationCap size={12} className="text-accent-fg shrink-0" />
                      <span className="truncate">{formatEducationText(item)}</span>
                    </p>
                  ))}
                </div>
              )}
              {locationStr && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <MapPin size={12} className="text-accent-fg shrink-0" />
                  <span className="truncate">{locationStr}</span>
                </p>
              )}
              {hometownStr && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Home size={12} className="text-amber-500 shrink-0" />
                  <span className="truncate">From {hometownStr}</span>
                </p>
              )}
            </div>
          </section>

          {/* Profile Picture Upload */}
          <section className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 shadow-xs">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Profile picture</h2>
            <p className="mb-4 mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Use a square image for the best result.</p>
            <label className={`inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full border border-zinc-200 dark:border-white/10 px-4 text-xs font-semibold text-accent-fg hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
              {uploading === 'avatar' ? 'Uploading…' : 'Change profile picture'}
              <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => void upload('avatar', event)} />
            </label>
          </section>

          {/* Cover Photo Upload */}
          <section className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 shadow-xs">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Cover photo</h2>
            <p className="mb-4 mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">A wide image helps your profile feel personal.</p>
            <label className={`inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full border border-zinc-200 dark:border-white/10 px-4 text-xs font-semibold text-accent-fg hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
              {uploading === 'cover' ? 'Uploading…' : 'Change cover photo'}
              <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => void upload('cover', event)} />
            </label>
          </section>
        </aside>
      </div>
    </div>
  );
}
