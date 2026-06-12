'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClerk, UserButton } from '@clerk/nextjs';
import { 
  getNotificationsList, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '@/server/actions/notification.actions';
import { 
  Scale, 
  Users, 
  FileText, 
  Folder,
  Calendar, 
  Clock, 
  ShieldAlert, 
  LogOut, 
  Sun, 
  Moon,
  Menu,
  X,
  Receipt,
  History,
  Bell,
  Check,
  CheckCheck,
  ExternalLink
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  link_url: string | null;
  created_at: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Theme configuration
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load notifications on mount
  useEffect(() => {
    async function loadNotifications() {
      try {
        const data = await getNotificationsList();
        setNotifications(data || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }
    loadNotifications();

    // Poll every 30 seconds for live updates in compliance-supporting workflows
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close notification center
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Escape key to close popover
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    const res = await markNotificationAsRead(id);
    if (res.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const handleMarkAllRead = async () => {
    const res = await markAllNotificationsAsRead();
    if (res.success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const navLinks = [
    { href: '/dashboard', label: 'Admin Dashboard', icon: Scale },
    { href: '/dashboard/clients', label: 'Clients Registry', icon: Users },
    { href: '/dashboard/matters', label: 'Matters Registry', icon: FileText },
    { href: '/dashboard/documents', label: 'Documents Vault', icon: Folder },
    { href: '/dashboard/deadlines', label: 'Court Deadlines', icon: Calendar },
    { href: '/dashboard/time', label: 'Time Tracking', icon: Clock },
    { href: '/dashboard/trust', label: 'Trust Metadata', icon: ShieldAlert },
    { href: '/dashboard/billing', label: 'Billing & Invoices', icon: Receipt },
    { href: '/dashboard/audit', label: 'Audit Ledger', icon: History },
  ];

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold tracking-wider flex items-center gap-2">
            <Scale className="text-gold-500 h-6 w-6" />
            <span>LEGAL <span className="text-gold-500">MATTERS</span></span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition ${
                  isActive 
                    ? 'bg-gold-500 text-slate-900 shadow-md shadow-gold-500/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <span>Theme Controls</span>
            {theme === 'dark' ? <Sun className="h-4 w-4 text-gold-400" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={() => signOut({ redirectUrl: '/' })}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-500/10 transition"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Top Header - Both Mobile and Desktop */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="fixed lg:absolute top-0 right-0 left-0 lg:left-64 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-30">
          <div className="flex items-center gap-4 lg:hidden">
            <Link href="/dashboard" className="text-lg font-bold tracking-wider flex items-center gap-2">
              <Scale className="text-gold-500 h-5 w-5" />
              <span>LEGAL <span className="text-gold-500">MATTERS</span></span>
            </Link>
          </div>
          <div className="hidden lg:block text-xs font-bold text-slate-400 tracking-wider">
            SOUTH AFRICAN PRACTICE PORTAL
          </div>

          {/* Right Header Panel */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Notification Bell Center */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setNotifDropdownOpen(!notifDropdownOpen);
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setNotifDropdownOpen(!notifDropdownOpen);
                  }
                }}
                aria-haspopup="true"
                aria-expanded={notifDropdownOpen}
                aria-label={`${unreadCount} unread notifications`}
                className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <Bell className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[10px] font-black text-slate-950 shadow-md">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Panel */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden animate-slide-in">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                    <h3 className="font-bold text-sm">Notifications Center</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-gold-500 hover:text-gold-600 font-bold flex items-center gap-1 transition"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>All Read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-150 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">
                        No active notifications in vault.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div 
                          key={item.id} 
                          className={`p-4 transition hover:bg-slate-50 dark:hover:bg-slate-850 flex gap-3 ${
                            !item.is_read ? 'bg-gold-500/5' : ''
                          }`}
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-xs font-bold ${!item.is_read ? 'text-gold-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                {item.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(item.created_at).toLocaleDateString('en-ZA', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              {item.message}
                            </p>
                            {item.link_url && (
                              <Link 
                                href={item.link_url}
                                onClick={() => setNotifDropdownOpen(false)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-gold-500 hover:underline mt-1"
                              >
                                <span>Resolve task</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                          {!item.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(item.id)}
                              aria-label="Mark as read"
                              className="self-center p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-400 hover:text-gold-500 transition"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Clerk User Button */}
          <UserButton showName />

          {/* Mobile Menu Trigger */}
            <button
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                setNotifDropdownOpen(false);
              }}
              className="lg:hidden text-slate-500 dark:text-slate-400 focus:outline-none p-2"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Sidebar overlay */}
        {mobileMenuOpen && (
          <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-40 pt-16 animate-slide-in">
            <nav className="flex-1 px-4 py-6 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                      isActive 
                        ? 'bg-gold-500 text-slate-900' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                <span>Toggle Mode</span>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => signOut({ redirectUrl: '/' })}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-500/10 transition"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-10 pt-24 lg:pt-24 overflow-y-auto max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
