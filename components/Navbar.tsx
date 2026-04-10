'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import {
  Bell,
  BookOpen,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  HelpCircle,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  School,
  Search,
  Settings,
  Sparkles,
  UserCircle,
  Users,
  X,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

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

type TeacherLookupRow = {
  registration_id: string;
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

type NavShortcut = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  allowedRoles?: string[];
};

// ============================================================================
// Constants
// ============================================================================

const ROLE_HINTS = ['ADMIN', 'ACADEMIC', 'TEACHER', 'FINANCE', 'STUDENT', 'PARENT'] as const;
const NAVBAR_HEIGHT_PX = 72;
const FINANCE_ACCESS_ROLES = ['ADMIN', 'FINANCE'];

const PRIMARY_NAV: NavShortcut[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER', 'FINANCE', 'STUDENT', 'PARENT'] },
  { label: 'Students', href: '/students', icon: Users, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER', 'FINANCE'] },
  { label: 'Academics', href: '/academics', icon: BookOpen, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER'] },
  { label: 'Plans', href: '/academics/plans', icon: ClipboardList, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER'] },
  { label: 'Assessments', href: '/assessments', icon: FileText, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER'] },
  { label: 'Finance', href: '/finance', icon: CreditCard, allowedRoles: FINANCE_ACCESS_ROLES },
];

const QUICK_LINKS: NavShortcut[] = [
  { label: 'Students', href: '/students', icon: Users, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER', 'FINANCE'] },
  { label: 'Academics', href: '/academics', icon: BookOpen, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER'] },
  { label: 'Lesson Plans', href: '/academics/plans', icon: ClipboardList, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER'] },
  { label: 'Create Notes', href: '/notes/create', icon: ClipboardList, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER'] },
  { label: 'Assessments', href: '/assessments', icon: FileText, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER'] },
  { label: 'Quizzes', href: '/quizzes', icon: FileText, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER'] },
  { label: 'Finance', href: '/finance', icon: CreditCard, allowedRoles: FINANCE_ACCESS_ROLES },
  { label: 'Reports', href: '/student-report', icon: FileText, allowedRoles: ['ADMIN', 'ACADEMIC', 'TEACHER', 'FINANCE'] },
];

// ============================================================================
// Utility Functions
// ============================================================================

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function useDebounced<T>(value: T, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const getFinanceModuleLink = (hasFinanceAccess: boolean): SearchItem | null => {
  if (!hasFinanceAccess) return null;
  return {
    kind: 'module',
    id: 'finance',
    title: 'Finance',
    subtitle: 'Tuitions, transactions and analytics',
    href: '/finance',
    icon: <CreditCard size={14} className="text-amber-500" />,
  };
};

// ============================================================================
// Main Component
// ============================================================================

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  // State
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [school, setSchool] = useState<GeneralInformationRow | null>(null);
  const [teacherProfileHref, setTeacherProfileHref] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(3);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(false);

  // Refs
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const quickLinksRef = useRef<HTMLDivElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounced(searchQuery, 250);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(-1);

  const maxResults = 8;
  const trimmedQuery = debouncedQuery.trim();
  const canSearch = trimmedQuery.length >= 2;

  // Derived values - Fixed: ensure boolean, not boolean | null
  const hasFinanceAccess = useMemo(() => {
    return profile?.role ? FINANCE_ACCESS_ROLES.includes(profile.role as any) : false;
  }, [profile]);

  // Fixed: Handle null role by defaulting to 'STUDENT'
  const userRole = profile?.role ?? 'STUDENT';
  
  const filteredPrimaryNav = useMemo(() => {
    return PRIMARY_NAV.filter(item => item.allowedRoles?.includes(userRole));
  }, [userRole]);

  const filteredQuickLinks = useMemo(() => {
    return QUICK_LINKS.filter(item => item.allowedRoles?.includes(userRole));
  }, [userRole]);

  const displayName = useMemo(() => {
    if (!profile) return 'User';
    if (profile.full_name?.trim()) return profile.full_name.trim();
    if (profile.email?.trim()) return profile.email.split('@')[0];
    return 'User';
  }, [profile]);

  const displayEmail = useMemo(() => profile?.email ?? '', [profile]);
  
  const firstName = useMemo(() => displayName.split(' ')[0] || 'User', [displayName]);

  const userInitials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).slice(0, 2);
    const initials = parts.map((p) => p[0]?.toUpperCase()).join('');
    return initials || 'U';
  }, [displayName]);

  const roleLabel = useMemo(() => userRole.toString().toUpperCase(), [userRole]);

  const schoolName = useMemo(() => school?.school_name || 'School', [school]);

  const profileHref = useMemo(() => {
    if (userRole === 'TEACHER' && teacherProfileHref) {
      return teacherProfileHref;
    }
    return '/profile';
  }, [userRole, teacherProfileHref]);

  const roleColor = useMemo(() => {
    switch (userRole) {
      case 'ADMIN':
        return 'from-red-500 to-pink-600';
      case 'TEACHER':
        return 'from-emerald-500 to-teal-600';
      case 'ACADEMIC':
        return 'from-blue-500 to-indigo-600';
      case 'FINANCE':
        return 'from-amber-500 to-orange-600';
      case 'STUDENT':
        return 'from-violet-500 to-purple-600';
      case 'PARENT':
        return 'from-cyan-500 to-sky-600';
      default:
        return 'from-gray-500 to-slate-600';
    }
  }, [userRole]);

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const closeAllMenus = () => {
    setIsUserMenuOpen(false);
    setIsQuickLinksOpen(false);
    setIsSearchOpen(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchItems([]);
    setActiveItemIndex(-1);
    setIsSearchOpen(false);
    searchInputRef.current?.focus();
  };

  const handleGoToResultsPage = (query: string) => {
    const clean = query.trim();
    if (!clean) return;
    router.push(`/search?q=${encodeURIComponent(clean)}`);
    setIsSearchOpen(false);
  };

  const handleOpenSearchItem = (item: SearchItem) => {
    router.push(item.href);
    setIsSearchOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen) setIsSearchOpen(true);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!searchItems.length) return;
        setActiveItemIndex((prev) => (prev + 1) % searchItems.length);
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        if (!searchItems.length) return;
        setActiveItemIndex((prev) => (prev - 1 + searchItems.length) % searchItems.length);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (activeItemIndex >= 0 && searchItems[activeItemIndex]) {
          handleOpenSearchItem(searchItems[activeItemIndex]);
        } else {
          handleGoToResultsPage(searchQuery);
        }
        break;
    }
  };

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await supabase.auth.signOut();
    router.replace('/');
  };

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Helper function to check if a search item matches the search term
  const doesItemMatchSearch = (item: SearchItem, term: string): boolean => {
    const lowerTerm = term.toLowerCase();
    const titleMatch = item.title.toLowerCase().includes(lowerTerm);
    const subtitleMatch = item.subtitle ? item.subtitle.toLowerCase().includes(lowerTerm) : false;
    return titleMatch || subtitleMatch;
  };

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Close menus on outside click and escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAllMenus();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (quickLinksRef.current && !quickLinksRef.current.contains(target)) {
        setIsQuickLinksOpen(false);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Load user profile
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

        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileErr) throw profileErr;

        const mergedProfile: ProfileRow = {
          user_id: user.id,
          email: profileData?.email ?? user.email ?? null,
          full_name: profileData?.full_name ?? null,
          role: profileData?.role ?? null,
          school_id: profileData?.school_id ?? null,
        };

        if (!cancelled) {
          setProfile(mergedProfile);
          setSchool(null);
        }

        if (mergedProfile.school_id) {
          const { data: schoolData, error: schoolErr } = await supabase
            .from('general_information')
            .select('id, school_name')
            .eq('id', mergedProfile.school_id)
            .maybeSingle();

          if (!cancelled) {
            if (!schoolErr && schoolData) setSchool(schoolData);
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

  // Load teacher profile href
  useEffect(() => {
    let cancelled = false;

    async function loadTeacherProfileHref() {
      setTeacherProfileHref(null);

      if (!profile?.user_id || userRole !== 'TEACHER') {
        return;
      }

      const { data, error } = await supabase
        .from('teachers')
        .select('registration_id')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      if (!cancelled && !error && (data as TeacherLookupRow | null)?.registration_id) {
        setTeacherProfileHref(
          `/teachers/${encodeURIComponent((data as TeacherLookupRow).registration_id)}`
        );
      }
    }

    loadTeacherProfileHref();

    return () => {
      cancelled = true;
    };
  }, [profile?.user_id, userRole]);

  // Search functionality
  useEffect(() => {
    let cancelled = false;

    async function performSearch() {
      setSearchError(null);

      if (!canSearch) {
        setSearchItems([]);
        setActiveItemIndex(-1);
        setSearchLoading(false);
        return;
      }

      const schoolId = profile?.school_id;
      if (!schoolId) {
        setSearchItems([]);
        setActiveItemIndex(-1);
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
            `registration_id.ilike.%${trimmedQuery}%,first_name.ilike.%${trimmedQuery}%,last_name.ilike.%${trimmedQuery}%,guardian_phone.ilike.%${trimmedQuery}%`
          )
          .limit(Math.ceil(maxResults / 2));

        const profilesTextPromise = supabase
          .from('profiles')
          .select('user_id, email, full_name, role, school_id')
          .eq('school_id', schoolId)
          .or(`email.ilike.%${trimmedQuery}%,full_name.ilike.%${trimmedQuery}%`)
          .limit(Math.ceil(maxResults / 2));

        const termUpper = trimmedQuery.toUpperCase();
        const isRoleSearch = ROLE_HINTS.includes(termUpper as any);

        const profilesRolePromise = isRoleSearch
          ? supabase
            .from('profiles')
            .select('user_id, email, full_name, role, school_id')
            .eq('school_id', schoolId)
            .eq('role', termUpper)
            .limit(Math.ceil(maxResults / 2))
          : null;

        const [studentsRes, profilesTextRes, profilesRoleRes] = await Promise.all([
          studentsPromise,
          profilesTextPromise,
          profilesRolePromise ?? Promise.resolve({ data: [], error: null } as any),
        ]);

        if (cancelled) return;

        if (studentsRes.error) throw studentsRes.error;
        if (profilesTextRes.error) throw profilesTextRes.error;
        if (profilesRoleRes?.error) throw profilesRoleRes.error;

        // Map students to search items
        const studentItems: SearchItem[] = (((studentsRes.data as StudentRow[]) || []) as StudentRow[]).map((student) => ({
          kind: 'student',
          id: student.registration_id,
          title: `${student.first_name} ${student.last_name}`,
          subtitle: `${student.registration_id}${student.guardian_phone ? ` • ${student.guardian_phone}` : ''}`,
          href: `/students/${encodeURIComponent(student.registration_id)}`,
          icon: <Users size={14} className="text-blue-500" />,
        }));

        // Merge profiles from both queries
        const profileMap = new Map<string, ProfileRow>();
        for (const profileItem of (((profilesTextRes.data as ProfileRow[]) || []) as ProfileRow[])) {
          profileMap.set(profileItem.user_id, profileItem);
        }
        for (const profileItem of ((((profilesRoleRes as any)?.data as ProfileRow[]) || []) as ProfileRow[])) {
          profileMap.set(profileItem.user_id, profileItem);
        }

        const profileItems: SearchItem[] = Array.from(profileMap.values()).map((profileItem) => ({
          kind: 'profile',
          id: profileItem.user_id,
          title: profileItem.full_name || profileItem.email || 'Profile',
          subtitle: `${(profileItem.role || 'STUDENT').toString().toUpperCase()}${profileItem.email ? ` • ${profileItem.email}` : ''}`,
          href: `/users/${profileItem.user_id}`,
          icon: <UserCircle size={14} className="text-emerald-500" />,
        }));

        // Build module links with role-based filtering
        const allModuleLinks: SearchItem[] = [
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
            id: 'academics',
            title: 'Academics',
            subtitle: 'Grades, subjects, exams and curriculum',
            href: '/academics',
            icon: <BookOpen size={14} className="text-blue-500" />,
          },
          {
            kind: 'module' as const,
            id: 'lesson-plans',
            title: 'Lesson Plans',
            subtitle: 'Daily, weekly, termly and yearly plans',
            href: '/academics/plans',
            icon: <ClipboardList size={14} className="text-indigo-500" />,
          },
          {
            kind: 'module' as const,
            id: 'assessments',
            title: 'Assessments',
            subtitle: 'Marks entry and assessment tools',
            href: '/assessments',
            icon: <FileText size={14} className="text-emerald-500" />,
          },
        ];

        // Filter module links by search term
        const moduleLinks = allModuleLinks.filter((module) => 
          doesItemMatchSearch(module, trimmedQuery)
        );

        // Add finance module only if user has access and it matches search
        const financeModule = getFinanceModuleLink(hasFinanceAccess);
        if (financeModule && doesItemMatchSearch(financeModule, trimmedQuery)) {
          moduleLinks.push(financeModule);
        }

        const mergedItems = [...studentItems, ...profileItems, ...moduleLinks].slice(0, maxResults);

        setSearchItems(mergedItems);
        setActiveItemIndex(mergedItems.length ? 0 : -1);
      } catch (error: any) {
        setSearchError(error?.message || 'Search failed');
        setSearchItems([]);
        setActiveItemIndex(-1);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }

    performSearch();

    return () => {
      cancelled = true;
    };
  }, [trimmedQuery, canSearch, profile?.school_id, hasFinanceAccess, maxResults]);

  // ==========================================================================
  // Render Helpers
  // ==========================================================================

  const renderSearchResults = () => {
    if (!isSearchOpen || searchQuery.trim().length === 0) return null;

    return (
      <div className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-50">
        <div className="px-4 py-2.5 text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
          {canSearch ? (
            <>
              <span className="font-medium text-slate-700">Results in </span>
              <span className="font-semibold text-blue-600">{schoolName}</span>
              <span className="font-medium text-slate-700"> for </span>
              <span className="font-semibold text-slate-900">"{searchQuery.trim()}"</span>
            </>
          ) : (
            'Type at least 2 characters'
          )}
        </div>

        {searchError && (
          <div className="px-4 py-3 text-sm text-red-600 bg-red-50">
            ⚠️ {searchError}
          </div>
        )}

        {!searchError && canSearch && searchItems.length === 0 && !searchLoading && (
          <div className="px-4 py-6 text-center">
            <Search size={24} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600 mb-1">No results in your school</p>
            <p className="text-xs text-slate-500">
              Press <span className="font-semibold">Enter</span> to search anyway
            </p>
          </div>
        )}

        {!searchError && searchItems.length > 0 && (
          <div className="max-h-80 overflow-auto py-1">
            {searchItems.map((item, idx) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onMouseEnter={() => setActiveItemIndex(idx)}
                onClick={() => handleOpenSearchItem(item)}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-blue-50 transition group',
                  idx === activeItemIndex && 'bg-blue-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center">
                    {item.icon || <Search size={14} className="text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      item.kind === 'student' && 'bg-blue-100 text-blue-700',
                      item.kind === 'profile' && 'bg-emerald-100 text-emerald-700',
                      item.kind === 'module' && 'bg-violet-100 text-violet-700'
                    )}
                  >
                    {item.kind}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={() => handleGoToResultsPage(searchQuery)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
          >
            View all results
          </button>
          <span className="text-[11px] text-slate-500">
            ↑ ↓ navigate • ↵ open
          </span>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // Main Render
  // ==========================================================================

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col">
          {/* Top Bar */}
          <div className="flex h-[72px] items-center gap-4 px-4 sm:px-6 lg:px-8">
            {/* School Logo & Name */}
            <button
              onClick={() => router.push('/dashboard')}
              className="hidden lg:flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-slate-100 transition"
              title="Go to dashboard"
            >
              <div className="relative">
                <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${roleColor} flex items-center justify-center text-white font-bold shadow-md`}>
                  <span className="text-sm font-semibold">{schoolName.slice(0, 1).toUpperCase()}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border-2 border-white flex items-center justify-center">
                  <School size={10} className="text-slate-600" />
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900 max-w-[220px] truncate">
                  {profileLoading ? 'Loading…' : schoolName}
                </p>
                <p className="text-xs text-slate-500">
                  {profileLoading ? 'Loading…' : `Welcome back, ${firstName}`}
                </p>
              </div>
            </button>

            {/* Search Bar */}
            <div ref={searchWrapRef} className="relative flex-1 min-w-0">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search students, staff, modules, lesson plans..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10"
                />

                {searchLoading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </div>

              {renderSearchResults()}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Quick Links Dropdown */}
              {filteredQuickLinks.length > 0 && (
                <div className="relative hidden md:block" ref={quickLinksRef}>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                    onClick={() => setIsQuickLinksOpen((prev) => !prev)}
                  >
                    <Sparkles size={16} />
                    Quick Links
                    <ChevronDown
                      size={14}
                      className={cn('transition-transform', isQuickLinksOpen && 'rotate-180')}
                    />
                  </button>

                  {isQuickLinksOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                      <div className="p-2">
                        {filteredQuickLinks.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.href}
                              onClick={() => {
                                setIsQuickLinksOpen(false);
                                router.push(item.href);
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 hover:bg-slate-100 transition"
                            >
                              <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
                                <Icon size={18} className="text-slate-600" />
                              </div>
                              <div className="text-left">
                                <p className="font-medium">{item.label}</p>
                                <p className="text-xs text-slate-500">Open {item.label.toLowerCase()}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Help Button */}
              <button
                className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition"
                title="Help & Support"
                onClick={() => router.push('/help')}
              >
                <HelpCircle size={18} />
              </button>

              {/* Notifications Button */}
              <button
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition"
                title="Notifications"
                onClick={() => setNotifications(0)}
              >
                <Bell size={18} />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-[10px] font-bold text-white shadow">
                    {notifications}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-100 transition"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="relative">
                    <div className={`h-9 w-9 rounded-2xl bg-gradient-to-br ${roleColor} text-white flex items-center justify-center text-sm font-semibold shadow`}>
                      {profileLoading ? '…' : userInitials}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white border-2 border-white">
                      <div className="h-full w-full rounded-full bg-green-500" />
                    </div>
                  </div>

                  <div className="hidden md:block text-left leading-tight">
                    <p className="max-w-[160px] truncate text-sm font-semibold text-slate-900">
                      {profileLoading ? 'Loading…' : displayName}
                    </p>
                    <p className="max-w-[160px] truncate text-xs text-slate-500">
                      {displayEmail || '—'}
                    </p>
                  </div>

                  <ChevronDown
                    size={16}
                    className={cn('text-slate-400 transition-transform', isUserMenuOpen && 'rotate-180')}
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-50">
                    <div className="px-4 py-4 border-b border-slate-100 bg-slate-50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${roleColor} flex items-center justify-center text-white font-semibold shadow`}>
                          {userInitials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{displayEmail || '—'}</p>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        {roleLabel}
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          router.push(profileHref);
                        }}
                      >
                        <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
                          <UserCircle size={18} className="text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">My Profile</p>
                          <p className="text-xs text-slate-500">
                            {userRole === 'TEACHER' ? 'Open teacher profile' : 'View your profile'}
                          </p>
                        </div>
                      </button>

                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          router.push('/settings');
                        }}
                      >
                        <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <Settings size={18} className="text-emerald-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">Settings</p>
                          <p className="text-xs text-slate-500">Preferences & security</p>
                        </div>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 p-2 bg-slate-50">
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition"
                      >
                        <div className="h-9 w-9 rounded-xl bg-orange-100 flex items-center justify-center">
                          <LogOut size={18} className="text-orange-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">Sign Out</p>
                          <p className="text-xs text-slate-500">End current session</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Navigation Bar */}
          {filteredPrimaryNav.length > 0 && (
            <div className="hidden lg:flex items-center gap-2 px-4 sm:px-6 lg:px-8 pb-3">
              {filteredPrimaryNav.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);

                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    )}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div style={{ height: NAVBAR_HEIGHT_PX + (filteredPrimaryNav.length > 0 ? 52 : 0) }} />

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex flex-col items-center gap-1 text-slate-600 hover:text-blue-600 transition flex-1"
          >
            <Home size={20} />
            <span className="text-[11px] font-medium">Home</span>
          </button>

          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => searchInputRef.current?.focus(), 250);
              setIsSearchOpen(true);
            }}
            className="flex flex-col items-center gap-1 text-slate-600 hover:text-emerald-600 transition flex-1"
          >
            <Search size={20} />
            <span className="text-[11px] font-medium">Search</span>
          </button>

          {filteredPrimaryNav.some(nav => nav.href === '/academics') && (
            <button
              onClick={() => router.push('/academics')}
              className="flex flex-col items-center gap-1 text-slate-600 hover:text-indigo-600 transition flex-1"
            >
              <BookOpen size={20} />
              <span className="text-[11px] font-medium">Academics</span>
            </button>
          )}

          {filteredPrimaryNav.some(nav => nav.href === '/assessments') && (
            <button
              onClick={() => router.push('/assessments')}
              className="flex flex-col items-center gap-1 text-slate-600 hover:text-violet-600 transition flex-1"
            >
              <FileText size={20} />
              <span className="text-[11px] font-medium">Assess</span>
            </button>
          )}

          <button
            onClick={() => {
              if (userRole === 'TEACHER' && teacherProfileHref) {
                router.push(teacherProfileHref);
              } else {
                setIsUserMenuOpen(true);
              }
            }}
            className="flex flex-col items-center gap-1 text-slate-600 hover:text-orange-600 transition flex-1"
          >
            <UserCircle size={20} />
            <span className="text-[11px] font-medium">Profile</span>
          </button>
        </div>
      </div>
    </>
  );
}