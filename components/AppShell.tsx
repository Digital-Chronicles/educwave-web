'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  CreditCard,
  Settings,
  ChevronRight,
  Sparkles,
  FileChartLine,
  School,
  Menu,
  ChevronLeft,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/teachers', label: 'Teachers', icon: GraduationCap },
  { href: '/academics', label: 'Academics', icon: BookOpen },
  { href: '/academics/student-report', label: 'Reports', icon: FileChartLine },
  { href: '/assessments', label: 'Assessments', icon: FileText },
  { href: '/finance', label: 'Finance', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const navGroups = [
  { title: 'Core', items: navItems.slice(0, 3) },
  { title: 'Academic', items: navItems.slice(3, 6) },
  { title: 'Management', items: navItems.slice(6) },
];

const SIDEBAR_W = 256; // 64 * 4 = 256px (w-64)
const SIDEBAR_W_COLLAPSED = 80; // w-20

export function ShellSpacer({ collapsed }: { collapsed: boolean }) {
  // Use this around your main content (or in your layout) to avoid overlap
  return (
    <div
      className="hidden md:block"
      style={{ width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W }}
    />
  );
}

export default function AppShell() {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  // close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  const sidebarWidth = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;

  const SidebarInner = (
    <div className="flex h-full flex-col bg-white border-r border-gray-100 shadow-sm">
      {/* Header (fixed inside sidebar) */}
      <div className="border-b border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <School className="h-5 w-5 text-white" />
            </div>

            {!collapsed && (
              <div>
                <h1 className="font-bold text-gray-900 leading-tight">School Portal</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            )}
          </div>

          {/* desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="hidden md:inline-flex p-2 rounded-lg hover:bg-gray-50 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {/* mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {!collapsed && (
          <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm font-medium text-gray-900">Welcome, Admin</p>
            <p className="text-xs text-gray-600">Last login: Today</p>
          </div>
        )}
      </div>

      {/* Nav (scrollable only) */}
      <nav className="flex-1 overflow-y-auto p-4">
        {collapsed ? (
          <div className="space-y-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'h-12 w-12 rounded-lg flex items-center justify-center transition-colors border',
                    active
                      ? 'bg-blue-50 text-blue-600 border-blue-100'
                      : 'text-gray-500 hover:bg-gray-50 border-transparent',
                  ].join(' ')}
                  title={item.label}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div>
            {navGroups.map((group, idx) => (
              <div key={group.title} className={idx > 0 ? 'mt-6' : ''}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                  {group.title}
                </h3>

                <div className="space-y-1">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={[
                          'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border',
                          active
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent',
                        ].join(' ')}
                      >
                        <div
                          className={[
                            'p-2 rounded-lg',
                            active ? 'bg-blue-100' : 'bg-gray-100',
                          ].join(' ')}
                        >
                          <Icon className={active ? 'h-4 w-4 text-blue-600' : 'h-4 w-4 text-gray-500'} />
                        </div>

                        <span className="flex-1 text-sm font-medium">{item.label}</span>

                        {active && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Footer (fixed inside sidebar) */}
      <div className="border-t border-gray-100 bg-gray-50 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>

            {!collapsed && (
              <div>
                <p className="text-xs font-medium text-gray-900">School Portal</p>
                <p className="text-xs text-gray-500">v2.1.4</p>
              </div>
            )}
          </div>

          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>

        {!collapsed && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>Powered by DCAfrica &amp; TheirWord.org</p>
            <p className="text-gray-400">© 2024 All rights reserved</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar (hamburger) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white/90 backdrop-blur border-b border-gray-100 flex items-center px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-gray-50"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
        <div className="ml-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <School className="h-4 w-4 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-900">School Portal</p>
        </div>
      </div>

      {/* Desktop fixed sidebar */}
      <aside
        className="hidden md:block fixed left-0 top-0 z-40 h-screen"
        style={{ width: sidebarWidth }}
      >
        {SidebarInner}
      </aside>

      {/* Mobile drawer + overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 z-50 h-screen w-[86%] max-w-[320px]">
            {/* On mobile we show expanded style */}
            <div className="h-full bg-white border-r border-gray-100 shadow-xl">
              {/*
                On mobile: force expanded nav style
                (we can render SidebarInner with collapsed=false by temporarily ignoring state)
              */}
              <div className="flex h-full flex-col">
                {/* reuse header but without collapse toggle confusion */}
                <div className="border-b border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                        <School className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h1 className="font-bold text-gray-900 leading-tight">School Portal</h1>
                        <p className="text-xs text-gray-500">Admin Dashboard</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setMobileOpen(false)}
                      className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>

                  <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm font-medium text-gray-900">Welcome, Admin</p>
                    <p className="text-xs text-gray-600">Last login: Today</p>
                  </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4">
                  {navGroups.map((group, idx) => (
                    <div key={group.title} className={idx > 0 ? 'mt-6' : ''}>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                        {group.title}
                      </h3>

                      <div className="space-y-1">
                        {group.items.map(item => {
                          const Icon = item.icon;
                          const active = isActive(item.href);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={[
                                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border',
                                active
                                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent',
                              ].join(' ')}
                            >
                              <div className={active ? 'p-2 rounded-lg bg-blue-100' : 'p-2 rounded-lg bg-gray-100'}>
                                <Icon className={active ? 'h-4 w-4 text-blue-600' : 'h-4 w-4 text-gray-500'} />
                              </div>

                              <span className="flex-1 text-sm font-medium">{item.label}</span>
                              {active && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>

                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900">School Portal</p>
                        <p className="text-xs text-gray-500">v2.1.4</p>
                      </div>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Powered by DCAfrica &amp; TheirWord.org</p>
                    <p className="text-gray-400">© 2024 All rights reserved</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Content offset helpers (so pages don’t hide under fixed sidebar / mobile topbar) */}
      <div
        className="hidden md:block"
        style={{ marginLeft: sidebarWidth }}
      />
      <div className="md:hidden h-14" />
    </>
  );
}
