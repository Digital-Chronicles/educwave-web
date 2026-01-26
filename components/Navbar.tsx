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
  School,
  Users,
  BookOpen,
  CreditCard,
  Sparkles,
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
  icon?: React.ReactNode;
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

const MODULE_ICONS: Record<string, React.ReactNode> = {
  students: <Users size={14} />,
  finance: <CreditCard size={14} />,
  academics: <BookOpen size={14} />,
};

export default function Navbar() {
  const router = useRouter();

  // Theme
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeTransition, setThemeTransition] = useState(false);

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
    setThemeTransition(true);
    setIsDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
    setTimeout(() => setThemeTransition(false), 300);
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

  const roleColor = useMemo(() => {
    const role = (profile?.role || 'STUDENT').toUpperCase();
    switch (role) {
      case 'ADMIN': return 'from-red-500 to-pink-600';
      case 'TEACHER': return 'from-emerald-500 to-teal-600';
      case 'ACADEMIC': return 'from-blue-500 to-indigo-600';
      case 'FINANCE': return 'from-amber-500 to-orange-600';
      case 'STUDENT': return 'from-violet-500 to-purple-600';
      case 'PARENT': return 'from-cyan-500 to-sky-600';
      default: return 'from-gray-500 to-slate-600';
    }
  }, [profile]);

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
          kind: 'student' as const,
          id: s.registration_id,
          title: `${s.first_name} ${s.last_name}`,
          subtitle: `${s.registration_id}${s.guardian_phone ? ` • ${s.guardian_phone}` : ''}`,
          href: `/students/${encodeURIComponent(s.registration_id)}`,
          icon: <Users size={14} className="text-blue-500" />,
        }));

        const profileMap = new Map<string, ProfileRow>();
        for (const p of (((pTextRes.data as ProfileRow[]) || []) as ProfileRow[])) profileMap.set(p.user_id, p);
        for (const p of ((((pRoleRes as any)?.data as ProfileRow[]) || []) as ProfileRow[])) profileMap.set(p.user_id, p);

        const pItems: SearchItem[] = Array.from(profileMap.values()).map((p) => ({
          kind: 'profile' as const,
          id: p.user_id,
          title: p.full_name || p.email || 'Profile',
          subtitle: `${(p.role || 'STUDENT').toString().toUpperCase()}${p.email ? ` • ${p.email}` : ''}`,
          href: `/users/${p.user_id}`,
          icon: <UserCircle size={14} className="text-emerald-500" />,
        }));

        const moduleLinks: SearchItem[] = [
          { 
            kind: 'module' as const, 
            id: 'students', 
            title: 'Students', 
            subtitle: 'Manage student records',
            href: '/students',
            icon: <Users size={14} className="text-violet-500" />,
          },
          { 
            kind: 'module' as const, 
            id: 'finance-management', 
            title: 'Finance Management', 
            subtitle: 'Tuitions & transactions',
            href: '/finance/management',
            icon: <CreditCard size={14} className="text-amber-500" />,
          },
          { 
            kind: 'module' as const, 
            id: 'finance-stats', 
            title: 'Finance Analytics', 
            subtitle: 'Reports & dashboard',
            href: '/finance/stats',
            icon: <Sparkles size={14} className="text-blue-500" />,
          },
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
      {/* FIXED NAVBAR - FULL WIDTH */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/85 dark:border-slate-800/70 dark:bg-slate-950/90 supports-[backdrop-filter]:dark:bg-slate-950/85 transition-all duration-300 shadow-sm hover:shadow-md">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8 w-full">
          {/* Left: Brand */}
          <button
            onClick={goHome}
            className="group hidden md:flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            title="Go to dashboard"
          >
            <div className="relative">
              <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${roleColor} flex items-center justify-center text-white font-bold shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105`}>
                <span className="text-sm font-semibold">{schoolName.slice(0, 1).toUpperCase()}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-950 flex items-center justify-center">
                <School size={10} className="text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[260px] group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                {profileLoading ? 'Loading…' : schoolName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                {profileLoading ? 'Loading…' : `Welcome back, ${displayName.split(' ')[0] || 'User'} 👋`}
              </p>
            </div>
          </button>

          {/* Center: Search - FULL WIDTH FLEXIBLE */}
          <div ref={searchWrapRef} className="relative flex-1 mx-4 lg:mx-8">
            <div className="relative w-full">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors"
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
                  'w-full rounded-2xl border border-slate-200 bg-white/80 px-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-300',
                  'focus:border-blue-500 focus:bg-white focus:shadow-lg focus:shadow-blue-500/10',
                  'dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500',
                  'dark:focus:border-blue-400 dark:focus:bg-slate-900 dark:focus:shadow-blue-400/10',
                  searchOpen && 'rounded-b-2xl rounded-t-2xl'
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all duration-200"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              ) : null}
            </div>

            {/* Suggestions dropdown */}
            {searchOpen && q.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2.5 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50">
                  {canSearch ? (
                    <>
                      <span className="font-medium text-slate-700 dark:text-slate-300">Results in</span>{' '}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{schoolName}</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">for</span>{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">"{q.trim()}"</span>
                    </>
                  ) : (
                    <>Type at least 2 characters</>
                  )}
                </div>

                {searchError && (
                  <div className="px-4 py-3 text-sm text-red-600 bg-red-50/50 dark:bg-red-500/10 dark:text-red-400">
                    ⚠️ {searchError}
                  </div>
                )}

                {!searchError && canSearch && items.length === 0 && !searchLoading && (
                  <div className="px-4 py-6 text-center">
                    <Search size={24} className="mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">No results in your school</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Press <span className="font-semibold">Enter</span> to search anyway
                    </p>
                  </div>
                )}

                {!searchError && items.length > 0 && (
                  <div className="max-h-80 overflow-auto py-1">
                    {items.map((it, idx) => (
                      <button
                        key={`${it.kind}-${it.id}`}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => openItem(it)}
                        className={cn(
                          'w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all duration-200 group',
                          idx === activeIndex && 'bg-blue-50 dark:bg-blue-500/10'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                            {it.icon || <Search size={14} className="text-slate-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {it.title}
                            </p>
                            {it.subtitle && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{it.subtitle}</p>
                            )}
                          </div>
                          <span className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                            it.kind === 'student' && "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
                            it.kind === 'profile' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
                            it.kind === 'module' && "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                          )}>
                            {it.kind}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-100 dark:border-slate-900 px-4 py-3 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                  <button
                    type="button"
                    onClick={() => goToResultsPage(q)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 hover:underline flex items-center gap-1 transition-all hover:gap-2"
                  >
                    View all results
                    <ChevronDown size={12} className="rotate-270" />
                  </button>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">↓</kbd>
                    <span>navigate •</span>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">↵</kbd>
                    <span>open</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={cn(
                "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100 transition-all duration-300 hover:scale-105 active:scale-95 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800",
                themeTransition && "animate-pulse"
              )}
              title="Toggle theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500 animate-ping opacity-75" />
            </button>

            <button
              className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100 transition-all duration-300 hover:scale-105 active:scale-95 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 group"
              title="Help & Support"
              onClick={() => router.push('/help')}
            >
              <HelpCircle size={18} className="group-hover:rotate-12 transition-transform" />
            </button>

            <button
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100 transition-all duration-300 hover:scale-105 active:scale-95 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 group"
              title="Notifications (click to clear)"
              onClick={() => setNotifications(0)}
            >
              <Bell size={18} className="group-hover:animate-shake" />
              {notifications > 0 && (
                <>
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-1.5 text-[11px] font-semibold text-white shadow-lg group-hover:scale-110 transition-transform">
                    {notifications}
                  </span>
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-1.5 text-[11px] font-semibold text-white shadow-lg animate-ping opacity-60" />
                </>
              )}
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen((v) => !v)}
                className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 hover:bg-slate-100 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900/80 dark:hover:bg-slate-800"
                aria-expanded={isUserMenuOpen}
              >
                <div className="relative">
                  <div className={`h-9 w-9 rounded-2xl bg-gradient-to-br ${roleColor} text-white flex items-center justify-center text-sm font-semibold shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105`}>
                    {profileLoading ? '…' : userInitials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-950">
                    <div className="h-full w-full rounded-full bg-green-500 animate-pulse" />
                  </div>
                </div>
                <div className="hidden md:block text-left leading-tight">
                  <p className="max-w-[160px] truncate text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                    {profileLoading ? 'Loading…' : displayName}
                  </p>
                  <p className="max-w-[160px] truncate text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    {displayEmail || '—'}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={cn('text-slate-400 dark:text-slate-500 transition-transform duration-300', isUserMenuOpen && 'rotate-180')}
                />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 animate-in fade-in slide-in-from-top-5 duration-200">
                  <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-900 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${roleColor} flex items-center justify-center text-white font-semibold shadow-lg`}>
                        {userInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{displayEmail || '—'}</p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      {roleLabel}
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900 transition-all duration-200 group"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        router.push('/profile');
                      }}
                    >
                      <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UserCircle size={18} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">My Profile</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">View & edit your profile</p>
                      </div>
                    </button>

                    <button
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900 transition-all duration-200 group"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        router.push('/settings');
                      }}
                    >
                      <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Settings size={18} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Settings</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Preferences & security</p>
                      </div>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 p-2 dark:border-slate-900 bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-900/30">
                    <button
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await supabase.auth.signOut();
                        router.replace('/');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:text-orange-700 dark:text-slate-200 dark:hover:from-orange-500/10 dark:hover:to-red-500/10 dark:hover:text-orange-300 transition-all duration-200 group"
                    >
                      <div className="h-9 w-9 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <LogOut size={18} className="text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Sign Out</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">End current session</p>
                      </div>
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

      {/* Mobile bottom bar - FULL WIDTH */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/90 dark:border-slate-800 dark:bg-slate-950/95 supports-[backdrop-filter]:dark:bg-slate-950/90 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between px-6 py-3 w-full">
          <button 
            onClick={goHome} 
            className="flex flex-col items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:scale-105 active:scale-95 group flex-1"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/10 flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-100 dark:group-hover:from-blue-500/30 transition-all">
              <Home size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[11px] font-medium">Home</span>
          </button>

          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => searchInputRef.current?.focus(), 250);
              setSearchOpen(true);
            }}
            className="flex flex-col items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:scale-105 active:scale-95 group flex-1"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/20 dark:to-emerald-500/10 flex items-center justify-center group-hover:from-emerald-200 group-hover:to-emerald-100 dark:group-hover:from-emerald-500/30 transition-all">
              <Search size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[11px] font-medium">Search</span>
          </button>

          <button
            onClick={() => setNotifications(0)}
            className="relative flex flex-col items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200 hover:scale-105 active:scale-95 group flex-1"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-500/20 dark:to-orange-500/10 flex items-center justify-center group-hover:from-orange-200 group-hover:to-orange-100 dark:group-hover:from-orange-500/30 transition-all">
              <Bell size={20} className="text-orange-600 dark:text-orange-400" />
            </div>
            {notifications > 0 && (
              <span className="absolute -top-1 -right-3 inline-flex h-5 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-[10px] font-bold text-white shadow-lg animate-bounce">
                {notifications}
              </span>
            )}
            <span className="text-[11px] font-medium">Alerts</span>
          </button>

          <button
            onClick={() => setIsUserMenuOpen(true)}
            className="flex flex-col items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-200 hover:scale-105 active:scale-95 group flex-1"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-500/20 dark:to-violet-500/10 flex items-center justify-center group-hover:from-violet-200 group-hover:to-violet-100 dark:group-hover:from-violet-500/30 transition-all">
              <UserCircle size={20} className="text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-[11px] font-medium">Profile</span>
          </button>
        </div>
      </div>
    </>
  );
}