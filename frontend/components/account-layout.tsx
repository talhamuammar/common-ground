'use client';

import Link from 'next/link';
import { BrandLogo } from './brand-logo';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface AccountLayoutProps {
  children: React.ReactNode;
  mode?: 'login' | 'register';
  register?: boolean;
  registeredSuccess?: boolean;
}

export function AccountLayout({
  children,
  mode: propMode,
  register = false,
  registeredSuccess = false,
}: AccountLayoutProps) {
  const mode = propMode || (register ? 'register' : 'login');
  const isRegister = mode === 'register';

  return (
    <div className="relative flex min-h-dvh lg:h-dvh lg:overflow-hidden w-full antialiased selection:bg-accent-subtle selection:text-accent-fg">
      {/* ========================================================================= */}
      {/* LEFT PANEL: Tone 1 - Theme Accent Background (#1e3a2b / dark: #0c1a11)     */}
      {/* Featuring the clean artistic scenes and poetic copy (Desktop >= 1024px)   */}
      {/* ========================================================================= */}
      <aside
        className="relative hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-emerald-900/30 dark:border-white/[0.06] p-8 xl:p-12 bg-[#1e3a2b] dark:bg-[#0c1a11] text-white overflow-hidden select-none"
        aria-label="Common Ground brand introduction"
      >
        {/* Top: Same logo as the main page, styled for accent contrast */}
        <div className="relative z-10 flex items-center">
          <Link
            href="/"
            className="group inline-flex items-center transition-opacity hover:opacity-90 [&_span:first-child]:!text-white [&_span:last-child]:!text-emerald-300 dark:[&_span:last-child]:!text-emerald-400"
            aria-label="Common Ground home"
          >
            <BrandLogo size="default" />
          </Link>
        </div>

        {/* Center: Clean artistic illustration & matching typography */}
        <div className="relative z-10 my-auto py-2 text-center max-w-[420px] mx-auto w-full">
          {isRegister ? (
            // Create Account: Growing community tree, meeting on common ground
            <>
              <svg
                className="mx-auto mb-3.5 w-full max-w-[340px] xl:max-w-[370px] opacity-95 transition-opacity"
                viewBox="0 0 480 320"
                fill="none"
                aria-hidden="true"
              >
                {/* Backdrop silhouette pebble */}
                <path
                  d="M63 129C86 45 160 68 212 37C278 -2 341 46 358 109C375 173 447 205 394 267C341 329 235 293 169 309C82 330 20 243 63 129Z"
                  fill="#264836"
                  className="dark:fill-[#14281c]"
                />
                <circle cx="348" cy="62" r="16" fill="#305741" className="dark:fill-[#1b3424]" />
                <circle cx="59" cy="268" r="8" fill="#305741" className="dark:fill-[#1b3424]" />
                <ellipse cx="239" cy="285" rx="145" ry="13" fill="#173123" className="dark:fill-[#08130d]" />

                {/* Tree trunk & branches */}
                <path
                  d="M242 270V130M242 198L203 167M242 174L277 143"
                  stroke="#80a98f"
                  className="dark:stroke-emerald-400/80"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Tree canopy */}
                <path
                  d="M144 141C112 90 173 50 207 77C213 24 298 25 306 88C369 74 386 151 340 174C364 224 288 249 255 213C213 255 152 231 160 193C119 195 113 154 144 141Z"
                  fill="#2e6347"
                  className="dark:fill-[#1b4e33]"
                />

                {/* Connection arcs & accent dots */}
                <path
                  d="M187 120C217 147 267 153 316 113M175 179C213 203 289 205 329 164"
                  stroke="#87b697"
                  className="dark:stroke-emerald-300/50"
                  strokeWidth="2"
                  strokeDasharray="5 9"
                />
                <circle cx="192" cy="126" r="5" fill="#e6c99c" />
                <circle cx="282" cy="135" r="5" fill="#d4e1cf" />
                <circle cx="214" cy="194" r="5" fill="#e6c99c" />
                <circle cx="318" cy="176" r="5" fill="#d4e1cf" />

                {/* Speech dialogue cards */}
                <rect x="89" y="170" width="98" height="52" rx="14" fill="white" className="dark:fill-[#17221b]" />
                <path d="M110 222L116 232L129 222" fill="white" className="dark:fill-[#17221b]" />
                <path d="M107 190H160M107 202H142" stroke="#609172" className="dark:stroke-emerald-500/60" strokeWidth="4.5" strokeLinecap="round" />

                <rect x="296" y="198" width="82" height="48" rx="13" fill="#f4faf5" className="dark:fill-[#131d17]" />
                <path d="M351 246L358 257L362 243" fill="#f4faf5" className="dark:fill-[#131d17]" />
                <path d="M320 220L328 227L348 213" stroke="#2e6347" className="dark:stroke-emerald-400" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Meeting figures on common ground */}
                <circle cx="171" cy="242" r="11" fill="#c99979" />
                <path d="M152 275V263C152 245 184 245 184 263V275" fill="#58856c" />
                <path d="M160 275L155 290M176 275L181 290" stroke="#173123" strokeWidth="7" strokeLinecap="round" />

                <circle cx="288" cy="256" r="10" fill="#d6b58f" />
                <path d="M272 284V273C272 257 304 257 304 273V284" fill="#6f9880" />
              </svg>

              <p className="text-[10px] font-semibold tracking-[0.2em] text-emerald-300/90 dark:text-emerald-400/90 uppercase">
                A quiet corner
              </p>
              <h2 className="mt-2 text-2xl xl:text-[28px] font-bold leading-[1.24] tracking-tight text-white">
                A place for thoughts that linger,<br />and conversations that matter.
              </h2>
              <p className="mt-1.5 text-xs xl:text-[13px] leading-relaxed text-emerald-100/80 dark:text-slate-300/80 max-w-sm mx-auto">
                No algorithms fighting for your attention. Just honest thoughts, real people, and the quiet space to read and share.
              </p>
            </>
          ) : (
            // Login: Warm returning scene on a park bench under sheltered canopy
            <>
              <svg
                className="mx-auto mb-3.5 w-full max-w-[340px] xl:max-w-[370px] opacity-95 transition-opacity"
                viewBox="0 0 480 320"
                fill="none"
                aria-hidden="true"
              >
                {/* Backdrop silhouette pebble */}
                <path
                  d="M70 120C90 40 180 50 230 30C300 2 360 40 380 110C400 180 430 220 380 270C330 320 220 300 150 310C70 320 30 230 70 120Z"
                  fill="#264836"
                  className="dark:fill-[#14281c]"
                />
                {/* Warm evening orb / sun */}
                <circle cx="120" cy="72" r="20" fill="#eddcc2" opacity="0.9" />
                <circle cx="370" cy="82" r="12" fill="#305741" className="dark:fill-[#1b3424]" />
                <ellipse cx="240" cy="285" rx="145" ry="13" fill="#173123" className="dark:fill-[#08130d]" />

                {/* Tree trunk leaning over bench */}
                <path
                  d="M170 275V150C170 120 205 105 235 95"
                  stroke="#80a98f"
                  className="dark:stroke-emerald-400/80"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Tree canopy */}
                <path
                  d="M135 120C110 75 160 45 195 65C210 25 285 25 300 75C355 65 370 130 330 155C350 200 285 220 255 190C220 225 145 205 150 170C115 170 110 135 135 120Z"
                  fill="#2e6347"
                  className="dark:fill-[#1b4e33]"
                />

                {/* Floating message card */}
                <rect x="290" y="145" width="86" height="50" rx="13" fill="white" className="dark:fill-[#17221b]" />
                <path d="M312 195L318 206L328 195" fill="white" className="dark:fill-[#17221b]" />
                <path d="M308 165H356M308 176H340" stroke="#609172" className="dark:stroke-emerald-500/60" strokeWidth="4" strokeLinecap="round" />

                {/* Connecting dots */}
                <circle cx="195" cy="180" r="5" fill="#e6c99c" />
                <circle cx="215" cy="165" r="4" fill="#d4e1cf" />
                <circle cx="235" cy="180" r="4.5" fill="#e6c99c" />

                {/* Park Bench with seated figures */}
                <rect x="195" y="248" width="115" height="7" rx="3.5" fill="#609172" className="dark:fill-emerald-700/80" />
                <path d="M205 255V280M295 255V280M215 248V235C215 230 290 230 290 235V248" stroke="#80a98f" strokeWidth="4" strokeLinecap="round" />

                <circle cx="230" cy="220" r="10" fill="#c99979" />
                <path d="M218 248V237C218 226 244 226 244 237V248" fill="#58856c" />

                <circle cx="270" cy="222" r="9.5" fill="#d6b58f" />
                <path d="M258 248V239C258 228 282 228 282 239V248" fill="#6f9880" />
              </svg>

              <p className="text-[10px] font-semibold tracking-[0.2em] text-emerald-300/90 dark:text-emerald-400/90 uppercase">
                Welcome back
              </p>
              <h2 className="mt-2 text-2xl xl:text-[28px] font-bold leading-[1.24] tracking-tight text-white">
                Good to see you again.<br />Pick up right where you left off.
              </h2>
              <p className="mt-1.5 text-xs xl:text-[13px] leading-relaxed text-emerald-100/80 dark:text-slate-300/80 max-w-sm mx-auto">
                Your conversations, saved stories, and people are waiting right where you left them.
              </p>
            </>
          )}
        </div>

        {/* Empty bottom spacer to maintain vertical balance */}
        <div className="relative z-10" aria-hidden="true" />
      </aside>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: Tone 2 - Theme Base Color (Light: #f8faf8 / Dark: #000000)   */}
      {/* Welcomes visible on small screens and clean form container                */}
      {/* ========================================================================= */}
      <main className="flex flex-1 flex-col justify-between p-4 sm:p-6 lg:p-7 overflow-y-auto lg:overflow-hidden bg-[#f8faf8] dark:bg-[#000000] text-slate-900 dark:text-slate-100 transition-colors">
        {/* Top Navigation */}
        <div className="flex w-full items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-lg py-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back to community</span>
          </Link>

          {/* Mobile-only logo (exact same component, unaltered) */}
          <div className="lg:hidden">
            <Link href="/" aria-label="Common Ground home">
              <BrandLogo size="default" />
            </Link>
          </div>
        </div>

        {/* Center: Form Card with Warm Welcome visible on all screens */}
        <div className="my-auto flex w-full flex-col items-center justify-center py-2">
          <div
            className={`w-full ${
              isRegister ? 'max-w-[430px]' : 'max-w-[390px]'
            } rounded-2xl bg-white text-slate-900 p-5 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-200/90 dark:bg-[#0c100d] dark:text-slate-100 dark:border-white/[0.08] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all`}
          >
            {/* Header: Warm welcome visible on both mobile and desktop */}
            <div className="mb-3.5 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent-fg dark:text-emerald-400 mb-0.5">
                {isRegister ? 'A quiet corner' : 'Welcome back'}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isRegister ? 'Create account' : 'Sign in'}
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isRegister
                  ? 'A place for thoughts that linger, and conversations that matter.'
                  : 'Good to see you again. Pick up right where you left off.'}
              </p>
            </div>

            {/* Registration Success Banner (when redirected with ?registered=1) */}
            {registeredSuccess && (
              <div
                role="status"
                className="mb-3 flex items-start gap-2.5 rounded-xl border border-emerald-200/90 bg-emerald-50/90 p-2.5 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold">Account created successfully!</p>
                  <p className="mt-0.5 text-[11px] opacity-90">Please sign in with your email and password below.</p>
                </div>
              </div>
            )}

            {/* The Form Content */}
            {children}
          </div>

          {/* Notice below card */}
          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            {isRegister
              ? 'By creating an account, you agree to our Terms and Privacy policy.'
              : 'Common Ground protects your personal data.'}
          </p>
        </div>

        {/* Mobile Bottom Footer */}
        <div className="lg:hidden text-center text-[10px] text-slate-400 dark:text-slate-600 pb-1">
          &copy; {new Date().getFullYear()} Common Ground
        </div>
      </main>
    </div>
  );
}
