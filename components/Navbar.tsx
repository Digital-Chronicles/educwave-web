// components/Navbar.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { 
  Bell, 
  ChevronDown, 
  Search, 
  UserCircle,
  LogOut,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Home
} from 'lucide-react';

interface NavbarProps {
  userEmail: string | null;
  userName?: string | null;
}

export default function Navbar({ userEmail, userName }: NavbarProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const clearNotifications = () => {
    setNotifications(0);
  };

  const userInitials = userName 
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase()
    : userEmail?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      <header className="sticky top-0 h-16 flex items-center justify-between px-4 lg:px-6 border-b border-gray-200 bg-white/95 backdrop-blur-lg z-50 shadow-sm">
        {/* Left Section: Logo & Search */}
        <div className="flex items-center gap-4 flex-1">
          <div className="hidden md:flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
              <span className="text-sm">SP</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-gray-900">
                School Portal Pro
              </p>
              <p className="text-xs text-gray-500">
                Welcome back, {userName?.split(' ')[0] || 'Admin'} 👋
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <form 
            onSubmit={handleSearch}
            className={`relative flex-1 max-w-md ${isSearchFocused ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="relative">
              <Search 
                size={18} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
              />
              <input
                type="text"
                placeholder="Search students, teachers, modules..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Section: Actions & User */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Help */}
          <button
            className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
            title="Help & Support"
          >
            <HelpCircle size={20} />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors relative"
              onClick={clearNotifications}
              title="Notifications"
            >
              <Bell size={20} />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {notifications}
                </span>
              )}
            </button>
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors group"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {userInitials}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <p className="text-sm font-medium text-gray-900">
                  {userName || 'User Account'}
                </p>
                <p className="text-xs text-gray-500">
                  {userEmail || 'admin@school.edu'}
                </p>
              </div>
              <ChevronDown 
                size={16} 
                className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {userName || 'User Account'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {userEmail || 'admin@school.edu'}
                    </p>
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      Administrator Account
                    </div>
                  </div>
                  
                  <div className="py-2">
                    <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                      <UserCircle size={18} className="text-gray-500" />
                      <span>My Profile</span>
                    </button>
                    <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                      <Settings size={18} className="text-gray-500" />
                      <span>Account Settings</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-100 py-2">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors group"
                    >
                      <LogOut size={18} className="text-gray-500 group-hover:text-orange-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Bar for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 py-2 px-4">
        <div className="flex items-center justify-between">
          <button className="flex flex-col items-center text-blue-600">
            <Home size={20} />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button className="flex flex-col items-center text-gray-600">
            <Search size={20} />
            <span className="text-xs mt-1">Search</span>
          </button>
          <button className="flex flex-col items-center text-gray-600 relative">
            <Bell size={20} />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications}
              </span>
            )}
            <span className="text-xs mt-1">Alerts</span>
          </button>
          <button 
            onClick={() => setIsDropdownOpen(true)}
            className="flex flex-col items-center text-gray-600"
          >
            <UserCircle size={20} />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        /* Dark mode styles can be added here */
        .dark .bg-white {
          background-color: #1f2937;
        }
        .dark .text-gray-900 {
          color: #f9fafb;
        }
        .dark .border-gray-200 {
          border-color: #374151;
        }
      `}</style>
    </>
  );
}