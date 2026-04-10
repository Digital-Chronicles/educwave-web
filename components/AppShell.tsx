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
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/teachers', label: 'Teachers', icon: GraduationCap },
  { href: '/academics', label: 'Academics', icon: BookOpen },
  { href: '/student-report', label: 'Reports', icon: FileChartLine },
  { href: '/assessments', label: 'Assessments', icon: FileText },
  { href: '/finance', label: 'Finance', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const navGroups: NavGroup[] = [
  { title: 'Core', items: navItems.slice(0, 3) },
  { title: 'Academic', items: navItems.slice(3, 6) },
  { title: 'Management', items: navItems.slice(6) },
];

const SIDEBAR_W_EXPANDED = 256;
const SIDEBAR_W_COLLAPSED = 80;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function ShellSpacer({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className="hidden md:block shrink-0"
      style={{
        width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED,
      }}
    />
  );
}

function BrandBlock({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
        <School className="h-5 w-5 text-white" />
      </div>

      {!collapsed && (
        <div>
          <h1 className="leading-tight font-bold text-gray-900">School Portal</h1>
          <p className="text-xs text-gray-500">Admin Dashboard</p>
        </div>
      )}
    </div>
  );
}

function WelcomeCard({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) return null;

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
      <p className="text-sm font-medium text-gray-900">Welcome, Admin</p>
      <p className="text-xs text-gray-600">Last login: Today</p>
    </div>
  );
}

function NavLinkItem({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        title={item.label}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-lg border transition-colors',
          active
            ? 'border-blue-100 bg-blue-50 text-blue-600'
            : 'border-transparent text-gray-500 hover:bg-gray-50'
        )}
      >
        <Icon className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200',
        active
          ? 'border-blue-100 bg-blue-50 text-blue-700'
          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      <div
        className={cn(
          'rounded-lg p-2',
          active ? 'bg-blue-100' : 'bg-gray-100'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4',
            active ? 'text-blue-600' : 'text-gray-500'
          )}
        />
      </div>

      <span className="flex-1 text-sm font-medium">{item.label}</span>

      {active && <div className="h-2 w-2 rounded-full bg-blue-500" />}
    </Link>
  );
}

function SidebarFooter({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="border-t border-gray-100 bg-gray-50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
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
        <div className="space-y-1 text-xs text-gray-500">
          <p>Powered by DCAfrica &amp; TheirWord.org</p>
          <p className="text-gray-400">© 2024 All rights reserved</p>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  pathname,
  collapsed,
  mobile,
  onCloseMobile,
  onToggleCollapse,
}: {
  pathname: string;
  collapsed: boolean;
  mobile?: boolean;
  onCloseMobile?: () => void;
  onToggleCollapse?: () => void;
}) {
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="flex h-full flex-col border-r border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <div className="mb-5 flex items-center justify-between">
          <BrandBlock collapsed={collapsed} />

          <div className="flex items-center gap-2">
            {!mobile && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden rounded-lg p-2 transition-colors hover:bg-gray-50 md:inline-flex"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronLeft className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}

            {mobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-2 transition-colors hover:bg-gray-50"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>

        <WelcomeCard collapsed={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto p-4" aria-label="Sidebar navigation">
        {collapsed ? (
          <div className="space-y-2">
            {navItems.map((item) => (
              <NavLinkItem
                key={item.href}
                item={item}
                active={isActive(item.href)}
                collapsed
                onNavigate={mobile ? onCloseMobile : undefined}
              />
            ))}
          </div>
        ) : (
          <div>
            {navGroups.map((group, index) => (
              <section key={group.title} className={index > 0 ? 'mt-6' : ''}>
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {group.title}
                </h3>

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLinkItem
                      key={item.href}
                      item={item}
                      active={isActive(item.href)}
                      collapsed={false}
                      onNavigate={mobile ? onCloseMobile : undefined}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </nav>

      <SidebarFooter collapsed={collapsed} />
    </div>
  );
}

export default function AppShell() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = useMemo(
    () => (collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED),
    [collapsed]
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b border-gray-100 bg-white/90 px-4 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-50"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-sidebar"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>

        <div className="ml-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
            <School className="h-4 w-4 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-900">School Portal</p>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className="fixed top-0 left-0 z-40 hidden h-screen md:block"
        style={{ width: sidebarWidth }}
        aria-label="Desktop sidebar"
      >
        <SidebarContent
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />

          <aside
            id="mobile-sidebar"
            className="fixed top-0 left-0 z-50 h-screen w-[86%] max-w-[320px] md:hidden"
            aria-label="Mobile sidebar"
          >
            <div className="h-full border-r border-gray-100 bg-white shadow-xl">
              <SidebarContent
                pathname={pathname}
                collapsed={false}
                mobile
                onCloseMobile={() => setMobileOpen(false)}
              />
            </div>
          </aside>
        </>
      )}

      {/* Layout offsets */}
      <div className="hidden md:block" style={{ marginLeft: sidebarWidth }} />
      <div className="h-14 md:hidden" />
    </>
  );
}