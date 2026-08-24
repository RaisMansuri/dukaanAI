'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Settings,
  Store,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'New Bill (POS)', href: '/pos', icon: ShoppingCart, badge: 'FAST' },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Shop Setup', href: '/setup', icon: Store },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4 justify-between">
        <div className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* AI Helper Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 opacity-10">
            <Sparkles className="h-24 w-24 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Dukaan Assistant</span>
          </div>
          <p className="text-xs text-slate-300 leading-snug mb-3">
            Auto-generate HSN tax codes & track low stock alerts seamlessly.
          </p>
          <Link
            href="/pos"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Start Billing <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md lg:hidden">
        {NAV_ITEMS.slice(0, 5).map((item) => {
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
      </nav>
    </>
  );
}
