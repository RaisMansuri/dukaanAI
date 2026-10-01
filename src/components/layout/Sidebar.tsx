'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  CreditCard,
  FileText,
  Settings,
  Store,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'New Bill (POS)', href: '/pos', icon: ShoppingCart, badge: 'FAST' },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Inventory', href: '/inventory', icon: Boxes },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Udhar / Dues', href: '/dues', icon: CreditCard, badge: 'DUE' },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Shop Setup', href: '/setup', icon: Store },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { shop } = useAuth();
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  // Desktop Hover Expand State (Isolated ONLY for Desktop lg screens)
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsDesktopExpanded(true);
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsDesktopExpanded(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Quick mobile primary tabs (4 items + 1 More menu)
  const mobilePrimaryItems = [
    NAV_ITEMS[0], // Dashboard
    NAV_ITEMS[1], // New Bill (POS)
    NAV_ITEMS[2], // Products
    NAV_ITEMS[4], // Customers
  ];

  return (
    <>
      {/* Desktop Hover-Expandable Sidebar (min-width: 1024px) */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`hidden lg:flex shrink-0 h-screen flex-col border-r border-slate-200 bg-white justify-between z-40 transition-all duration-300 ease-in-out overflow-x-hidden ${
          isDesktopExpanded ? 'w-[300px] shadow-2xl' : 'w-[72px]'
        }`}
      >
        <div className="flex flex-col w-full">
          {/* Top Brand Logo Header (Aligned with h-16 Navbar) */}
          <div
            className={`flex h-16 items-center border-b border-slate-200/80 bg-slate-50/50 shrink-0 transition-all duration-300 ${
              isDesktopExpanded ? 'px-4 gap-3' : 'px-3 justify-center'
            }`}
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-3 min-w-0"
              title={!isDesktopExpanded ? (shop?.name || 'DukaanAI') : undefined}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
                <Store className="h-5 w-5" />
              </div>

              <div
                className={`min-w-0 transition-all duration-300 ${
                  isDesktopExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden pointer-events-none'
                }`}
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="font-extrabold text-lg tracking-tight text-slate-900">
                    Dukaan<span className="text-emerald-600">AI</span>
                  </span>
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-800 border border-amber-300">
                    IND
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold truncate max-w-[190px] whitespace-nowrap">
                  {shop?.name || 'Shree Ganesh Super Market'}
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="p-3 space-y-1">
            <div
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap transition-all duration-300 ${
                isDesktopExpanded ? 'opacity-100' : 'opacity-0 h-4 overflow-hidden'
              }`}
            >
              {isDesktopExpanded ? 'Main Menu' : '•••'}
            </div>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!isDesktopExpanded ? item.label : undefined}
                  className={`flex items-center rounded-xl transition-all duration-200 ${
                    isDesktopExpanded
                      ? 'justify-between px-3.5 py-2.5'
                      : 'justify-center p-3'
                  } ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        isActive ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <span
                      className={`text-sm whitespace-nowrap transition-all duration-300 ${
                        isDesktopExpanded
                          ? 'opacity-100 w-auto'
                          : 'opacity-0 w-0 overflow-hidden pointer-events-none'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {item.badge && isDesktopExpanded && (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white shrink-0 whitespace-nowrap">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (UNCHANGED FOR MOBILE) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md lg:hidden">
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}

        {/* More Menu Drawer Button */}
        <button
          onClick={() => setShowMoreDrawer(true)}
          className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
            showMoreDrawer ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>

      {/* Mobile More Navigation Drawer Sheet (UNCHANGED FOR MOBILE) */}
      {showMoreDrawer && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm lg:hidden animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setShowMoreDrawer(false)}
          />
          <div className="relative z-10 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm">
                  D
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">All Navigation Modules</h3>
                  <p className="text-[11px] text-slate-500">Access all DukaanAI tools & settings</p>
                </div>
              </div>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreDrawer(false)}
                    className={`flex items-center justify-between rounded-2xl p-3 border text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 shadow-xs'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


