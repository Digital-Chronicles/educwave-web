// components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/students', label: 'Students' },
  { href: '/teachers', label: 'Teachers' },
  { href: '/academics', label: 'Academics' },
  { href: '/assessments', label: 'Assessments' },
  { href: '/finance', label: 'Finance' },
  { href: '/settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-gray-200">
     
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200
                ${active
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                }
              `}
            >
              <div className={`
                h-8 w-8 rounded-lg flex items-center justify-center
                ${active 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-500'
                }
              `}>
                <span className="text-xs font-medium">
                  {item.label.charAt(0)}
                </span>
              </div>
              <span>{item.label}</span>
              {active && (
                <div className="ml-auto h-2 w-2 rounded-full bg-orange-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="px-2">
          <p className="text-xs text-gray-500 mb-2">Powered by</p>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">
              Next.js
            </span>
            <span className="px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-medium rounded-lg">
              Supabase
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
            © 2024 School Portal
          </p>
        </div>
      </div>
    </aside>
  );
}