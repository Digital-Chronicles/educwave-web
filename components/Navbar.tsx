'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import {
  Bell,
  ChevronDown,
  HelpCircle,
  Home,
  Loader2,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  UserCircle,
} from 'lucide-react';

type GeneralInformationRow = {
  id: string;
  school_name: string;
};

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  school_id: string | null;
};

type StudentRow = {
  registration_id: string;
  first_name: string;
  last_name: string;
  guardian_phone: string | null;
  school_id: string;
};

type SearchKind = 'student' | 'profile' | 'module';

type SearchItem = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const ROLE_HINTS = ['ADMIN', 'ACADEMIC', 'TEACHER', 'FINANCE', 'STUDENT', 'PARENT'] as const;

// Keep this in sync with h-16
const NAVBAR_HEIGHT_PX = 64;

export default function Navbar() {
  const router = useRouter();

  // Theme
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Menus
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Notifications (demo)
  const [notifications, setNotifications] = useState(3);

  // Auth/Profile
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<GeneralInformationRow | null>(null);

  // Search
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 250);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const maxResults = 8;
  const term = debouncedQ.trim();
  const canSearch = term.length >= 2;

  // ---------- THEME ----------
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const nextDark = saved ? saved === 'dark' : prefersDark;
    setIsDarkMode(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // ---------- CLOSE MENUS ON OUTSIDE CLICK / ESC ----------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setSearchOpen(false);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  // ---------- LOAD LOGGED-IN USER + PROFILE + SCHOOL ----------
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);

      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const user = authData?.user;
        if (!user) {
          if (!cancelled) {
            setProfile(null);
            setSchool(null);
          }
          return;
        }

        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (pErr) throw pErr;

        const merged: ProfileRow = {
          user_id: user.id,
          email: p?.email ?? user.email ?? null,
          full_name: p?.full_name ?? null,
          role: (p?.role as any) ?? null,
          school_id: p?.school_id ?? null,
        };

        if (!cancelled) {
          setProfile(merged);
          setSchool(null);
        }

        if (merged.school_id) {
          const { data: s, error: sErr } = await supabase
            .from('general_information')
            .select('id, school_name')
            .eq('id', merged.school_id)
            .maybeSingle();

          if (!cancelled) {
            if (!sErr && s) setSchool(s);
            else setSchool(null);
          }
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
          setSchool(null);
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = useMemo(() => {
    if (!profile) return 'User';
    if (profile.full_name?.trim()) return profile.full_name.trim();
    if (profile.email?.trim()) return profile.email.split('@')[0];
    return 'User';
  }, [profile]);

  const displayEmail = useMemo(() => profile?.email ?? '', [profile]);

  const userInitials = useMemo(() => {
    const name = displayName.trim();
    const parts = name.split(/\s+/).slice(0, 2);
    const initials = parts.map((p) => p[0]?.toUpperCase()).join('');
    return initials || 'U';
  }, [displayName]);

  const roleLabel = useMemo(
    () => (profile?.role || 'STUDENT').toString().toUpperCase(),
    [profile]
  );

  const schoolName = useMemo(() => school?.school_name || 'School', [school]);

  // ---------- SCHOOL-SCOPED SEARCH ----------
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setSearchError(null);

      if (!canSearch) {
        setItems([]);
        setActiveIndex(-1);
        setSearchLoading(false);
        return;
      }

      const schoolId = profile?.school_id;
      if (!schoolId) {
        setItems([]);
        setActiveIndex(-1);
        setSearchError('No school linked to your account.');
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);

      try {
        const studentsPromise = supabase
          .from('students')
          .select('registration_id, first_name, last_name, guardian_phone, school_id')
          .eq('school_id', schoolId)
          .or(
            `registration_id.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,guardian_phone.ilike.%${term}%`
          )
          .limit(Math.ceil(maxResults / 2));

        const profilesTextPromise = supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id')
          .eq('school_id', schoolId)
          .or(`email.ilike.%${term}%,full_name.ilike.%${term}%`)
          .limit(Math.ceil(maxResults / 2));

        const termUpper = term.toUpperCase();
        const isRoleSearch = ROLE_HINTS.includes(termUpper as any);

        const profilesRolePromise = isRoleSearch
          ? supabase
              .from('profiles')
              .select('user_id, email, full_name, role, school_id')
              .eq('school_id', schoolId)
              .eq('role', termUpper)
              .limit(Math.ceil(maxResults / 2))
          : null;

        const [sRes, pTextRes, pRoleRes] = await Promise.all([
          studentsPromise,
          profilesTextPromise,
          profilesRolePromise ?? Promise.resolve({ data: [], error: null } as any),
        ]);

        if (cancelled) return;

        if (sRes.error) throw sRes.error;
        if (pTextRes.error) throw pTextRes.error;
        if (pRoleRes?.error) throw pRoleRes.error;

        const sItems: SearchItem[] = (((sRes.data as StudentRow[]) || []) as StudentRow[]).map((s) => ({
          kind: 'student',
          id: s.registration_id,
          title: `${s.first_name} ${s.last_name}`,
          subtitle: `${s.registration_id}${s.guardian_phone ? ` • ${s.guardian_phone}` : ''}`,
          href: `/students/${encodeURIComponent(s.registration_id)}`,
        }));

        const profileMap = new Map<string, ProfileRow>();
        for (const p of (((pTextRes.data as ProfileRow[]) || []) as ProfileRow[])) profileMap.set(p.user_id, p);
        for (const p of ((((pRoleRes as any)?.data as ProfileRow[]) || []) as ProfileRow[])) profileMap.set(p.user_id, p);

        const pItems: SearchItem[] = Array.from(profileMap.values()).map((p) => ({
          kind: 'profile',
          id: p.user_id,
          title: p.full_name || p.email || 'Profile',
          subtitle: `${(p.role || 'STUDENT').toString().toUpperCase()}${p.email ? ` • ${p.email}` : ''}`,
          href: `/users/${p.user_id}`,
        }));

        const moduleLinks: SearchItem[] = [
          { kind: 'module', id: 'students', title: 'Students', subtitle: 'Open Students module', href: '/students' },
          { kind: 'module', id: 'finance-management', title: 'Finance Management', subtitle: 'Manage tuitions & transactions', href: '/finance/management' },
          { kind: 'module', id: 'finance-stats', title: 'Finance Stats', subtitle: 'Finance dashboard & reports', href: '/finance/stats' },
        ].filter((m) => m.title.toLowerCase().includes(term.toLowerCase()));

        const merged = [...sItems, ...pItems, ...moduleLinks].slice(0, maxResults);

        setItems(merged);
        setActiveIndex(merged.length ? 0 : -1);
      } catch (e: any) {
        setSearchError(e?.message || 'Search failed');
        setItems([]);
        setActiveIndex(-1);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [term, canSearch, profile?.school_id]);

  const goHome = () => router.push('/');
  const goToResultsPage = (query: string) => {
    const clean = query.trim();
    if (!clean) return;
    router.push(`/search?q=${encodeURIComponent(clean)}`);
    setSearchOpen(false);
  };

  const openItem = (it: SearchItem) => {
    router.push(it.href);
    setSearchOpen(false);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen) setSearchOpen(true);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!items.length) return;
      setActiveIndex((i) => (i + 1) % items.length);
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        openItem(items[activeIndex]);
        return;
      }
      goToResultsPage(q);
    }
  };

  return (
    <>
      {/* FIXED NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/70">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 lg:px-6">
          {/* Left: Brand */}
          <button
            onClick={goHome}
            className="hidden md:flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            title="Go to dashboard"
          >
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white font-bold shadow-sm">
              <span className="text-sm">{schoolName.slice(0, 1).toUpperCase()}</span>
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[260px]">
                {profileLoading ? 'Loading…' : schoolName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {profileLoading ? 'Loading…' : `Welcome back, ${displayName.split(' ')[0] || 'User'}`}
              </p>
            </div>
          </button>

          {/* Center: Search */}
          <div ref={searchWrapRef} className="relative flex-1">
            <div className="relative w-full max-w-xl">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                ref={searchInputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search students, staff, modules..."
                className={cn(
                  'w-full rounded-2xl border border-slate-200 bg-white/70 px-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition',
                  'focus:border-blue-500/60 focus:bg-white',
                  'dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:bg-slate-900'
                )}
              />

              {searchLoading ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : q ? (
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    setItems([]);
                    setActiveIndex(-1);
                    setSearchOpen(false);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              ) : null}
            </div>

            {/* Suggestions dropdown */}
            {searchOpen && q.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 z-50 max-w-xl">
                <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-900">
                  {canSearch ? (
                    <>
                      Results in{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{schoolName}</span> for{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">“{q.trim()}”</span>
                    </>
                  ) : (
                    <>Type at least 2 characters</>
                  )}
                </div>

                {searchError && <div className="px-3 py-3 text-sm text-red-600">{searchError}</div>}

                {!searchError && canSearch && items.length === 0 && !searchLoading && (
                  <div className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                    No results in your school. Press <span className="font-semibold">Enter</span> to search anyway.
                  </div>
                )}

                {!searchError && items.length > 0 && (
                  <div className="max-h-80 overflow-auto">
                    {items.map((it, idx) => (
                      <button
                        key={`${it.kind}-${it.id}`}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => openItem(it)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition',
                          idx === activeIndex && 'bg-blue-50 dark:bg-blue-500/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {it.title}
                            </p>
                            {it.subtitle && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{it.subtitle}</p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {it.kind}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-100 dark:border-slate-900 px-3 py-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => goToResultsPage(q)}
                    className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300"
                  >
                    View all results
                  </button>
                  <span className="text-[11px] text-slate-500">↑ ↓ navigate • Enter open</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-100 transition dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-100 transition dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Help & Support"
              onClick={() => router.push('/help')}
            >
              <HelpCircle size={18} />
            </button>

            <button
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-100 transition dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Notifications (click to clear)"
              onClick={() => setNotifications(0)}
            >
              <Bell size={18} />
              {notifications > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-semibold text-white shadow-sm">
                  {notifications}
                </span>
              )}
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-2 py-1.5 hover:bg-slate-100 transition dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800"
                aria-expanded={isUserMenuOpen}
              >
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                  {profileLoading ? '…' : userInitials}
                </div>
                <div className="hidden md:block text-left leading-tight">
                  <p className="max-w-[160px] truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {profileLoading ? 'Loading…' : displayName}
                  </p>
                  <p className="max-w-[160px] truncate text-xs text-slate-500 dark:text-slate-400">
                    {displayEmail || '—'}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={cn('text-slate-400 transition-transform', isUserMenuOpen && 'rotate-180')}
                />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-900">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{displayEmail || '—'}</p>
                    <div className="mt-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {roleLabel}
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900 transition"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        router.push('/profile');
                      }}
                    >
                      <UserCircle size={18} className="text-slate-500 dark:text-slate-400" />
                      My Profile
                    </button>

                    <button
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900 transition"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        router.push('/settings');
                      }}
                    >
                      <Settings size={18} className="text-slate-500 dark:text-slate-400" />
                      Account Settings
                    </button>
                  </div>

                  <div className="border-t border-slate-100 p-2 dark:border-slate-900">
                    <button
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await supabase.auth.signOut();
                        router.replace('/');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 dark:text-slate-200 dark:hover:bg-orange-500/10 dark:hover:text-orange-300 transition"
                    >
                      <LogOut size={18} className="text-slate-500 dark:text-slate-400" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer so content doesn't go under the fixed navbar */}
      <div className="no-print" style={{ height: NAVBAR_HEIGHT_PX }} />

      {/* Mobile bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-2">
          <button onClick={goHome} className="flex flex-col items-center gap-1 text-blue-600 dark:text-blue-400">
            <Home size={20} />
            <span className="text-[11px] font-medium">Home</span>
          </button>

          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => searchInputRef.current?.focus(), 250);
              setSearchOpen(true);
            }}
            className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300"
          >
            <Search size={20} />
            <span className="text-[11px] font-medium">Search</span>
          </button>

          <button
            onClick={() => setNotifications(0)}
            className="relative flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300"
          >
            <Bell size={20} />
            {notifications > 0 && (
              <span className="absolute -top-1 right-0 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
                {notifications}
              </span>
            )}
            <span className="text-[11px] font-medium">Alerts</span>
          </button>

          <button
            onClick={() => setIsUserMenuOpen(true)}
            className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300"
          >
            <UserCircle size={20} />
            <span className="text-[11px] font-medium">Profile</span>
          </button>
        </div>
      </div>
    </>
  );
}
