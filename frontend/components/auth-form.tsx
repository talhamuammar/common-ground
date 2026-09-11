'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { API_URL, getErrorMessage } from '../lib/api';
import { useAuth } from './auth-provider';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type Mode = 'register' | 'login';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const body = Object.fromEntries(data.entries());

    if (mode === 'register') {
      body.fullName = [String(body.firstName).trim(), String(body.lastName).trim()].filter(Boolean).join(' ');
      delete body.firstName;
      delete body.lastName;

      if (!body.birthDay || !body.birthMonth || !body.birthYear) {
        setError('Date of birth is required.');
        setLoading(false);
        return;
      }
      body.birthDate = `${body.birthYear}-${body.birthMonth}-${body.birthDay}`;
      delete body.birthYear;
      delete body.birthMonth;
      delete body.birthDay;

      if (body.password !== body.confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      delete body.confirmPassword;

      if (typeof body.birthDate === 'string') {
        body.birthDate = (body.birthDate as string).trim();
        if (!body.birthDate) delete body.birthDate;
      }
    }

    try {
      const response = await fetch(`${API_URL}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload, 'Something went wrong'));

      if (mode === 'register') {
        router.push('/login?registered=1');
      } else {
        const accessToken = (payload as { accessToken?: string }).accessToken;
        if (!accessToken) throw new Error('Login response did not include a session. Please try again.');
        await login(accessToken);
        router.push('/');
        router.refresh();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  }

  const register = mode === 'register';

  // Premium uniform input styles for both light & dark mode
  const inputWrapperStyles = "relative flex items-center w-full";
  const inputBaseStyles =
    "w-full min-w-0 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 dark:border-white/[0.12] dark:bg-[#111412] dark:focus:bg-[#111412] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-accent-fg dark:focus:ring-accent-fg/20 transition-all [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-[#111412] dark:[&>option]:text-slate-100";
  const labelStyles = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1";

  return (
    <form className="space-y-3" onSubmit={submit}>
      {register && (
        <>
          {/* First & Last Name */}
          <div>
            <label className={labelStyles}>Name</label>
            <div className="grid grid-cols-2 gap-2.5">
              <div className={inputWrapperStyles}>
                <input
                  className={inputBaseStyles}
                  aria-label="First name"
                  name="firstName"
                  autoComplete="given-name"
                  maxLength={39}
                  placeholder="First name"
                  required
                />
              </div>
              <div className={inputWrapperStyles}>
                <input
                  className={inputBaseStyles}
                  aria-label="Surname"
                  name="lastName"
                  autoComplete="family-name"
                  maxLength={40}
                  placeholder="Surname"
                  required
                />
              </div>
            </div>
          </div>

          {/* Username */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelStyles}>Username</label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">3–30 characters</span>
            </div>
            <div className={inputWrapperStyles}>
              <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 font-semibold text-xs select-none">
                @
              </span>
              <input
                className={`${inputBaseStyles} pl-8`}
                name="username"
                type="text"
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                title="Letters, numbers, and underscores only"
                autoComplete="username"
                placeholder="username"
                required
              />
            </div>
          </div>

          {/* Date of Birth (Mandatory) */}
          <div>
            <label className={labelStyles}>Date of birth</label>
            <div className="grid grid-cols-3 gap-2">
              <select
                className={`${inputBaseStyles} cursor-pointer`}
                name="birthDay"
                aria-label="Day of birth"
                autoComplete="bday-day"
                defaultValue=""
                required
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i} value={String(i + 1).padStart(2, '0')}>
                    {i + 1}
                  </option>
                ))}
              </select>

              <select
                className={`${inputBaseStyles} cursor-pointer`}
                name="birthMonth"
                aria-label="Month of birth"
                autoComplete="bday-month"
                defaultValue=""
                required
              >
                <option value="">Month</option>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                  <option key={month} value={String(i + 1).padStart(2, '0')}>
                    {month}
                  </option>
                ))}
              </select>

              <select
                className={`${inputBaseStyles} cursor-pointer`}
                name="birthYear"
                aria-label="Year of birth"
                autoComplete="bday-year"
                defaultValue=""
                required
              >
                <option value="">Year</option>
                {Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => (
                  <option key={i} value={new Date().getFullYear() - i}>
                    {new Date().getFullYear() - i}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {/* Email Address */}
      <div>
        <label className={labelStyles}>Email address</label>
        <div className={inputWrapperStyles}>
          <Mail size={15} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            className={`${inputBaseStyles} pl-10`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelStyles}>Password</label>
          {register && <span className="text-[11px] text-slate-400 dark:text-slate-500">Min. 8 characters</span>}
        </div>
        <div className={inputWrapperStyles}>
          <Lock size={15} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            className={`${inputBaseStyles} pl-10 pr-10`}
            name="password"
            type={passwordVisible ? 'text' : 'password'}
            minLength={8}
            maxLength={128}
            autoComplete={register ? 'new-password' : 'current-password'}
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onClick={() => setPasswordVisible(!passwordVisible)}
            className="absolute right-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1 cursor-pointer"
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
          >
            {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Confirm Password & Location (Register Only) */}
      {register && (
        <div>
          <label className={labelStyles}>Confirm password</label>
          <div className={inputWrapperStyles}>
            <Lock size={15} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              className={`${inputBaseStyles} pl-10 pr-10`}
              name="confirmPassword"
              type={confirmPasswordVisible ? 'text' : 'password'}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1 cursor-pointer"
              aria-label={confirmPasswordVisible ? 'Hide password' : 'Show password'}
            >
              {confirmPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200/90 bg-rose-50/90 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in duration-150"
        >
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="group/btn relative mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-accent-text font-semibold text-sm shadow-xs hover:bg-accent-hover active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>{register ? 'Creating account…' : 'Signing in…'}</span>
          </>
        ) : (
          <>
            <span>{register ? 'Create account' : 'Sign in'}</span>
            <ArrowRight size={15} className="transition-transform group-hover/btn:translate-x-0.5" />
          </>
        )}
      </button>

      {/* Mode Switch Navigation */}
      <div className="pt-2 text-center">
        <Link
          href={register ? '/login' : '/register'}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <span>{register ? 'Already have an account?' : "Don't have an account yet?"}</span>
          <span className="font-semibold text-accent-fg underline underline-offset-2">
            {register ? 'Log in' : 'Create account'}
          </span>
        </Link>
      </div>
    </form>
  );
}
