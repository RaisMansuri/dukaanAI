'use client';

import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row min-h-[100dvh] lg:h-screen lg:w-screen overflow-x-hidden lg:overflow-hidden bg-slate-50 text-slate-900">
      {/* Fixed Desktop Sidebar */}
      <Sidebar />

      {/* Main Layout Column */}
      <div className="flex flex-1 flex-col min-w-0 min-h-[100dvh] lg:h-screen lg:overflow-hidden">
        {/* Top Navigation Bar */}
        <Navbar />

        {/* Scrollable Main Content Area */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
