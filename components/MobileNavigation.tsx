'use client';

import React from 'react';
import { useSplitest } from '@/lib/store';
import { Users, MessageSquare, Receipt, User, Plus } from 'lucide-react';

export function MobileNavigation() {
  const { currentView, setCurrentView, setIsAddExpenseModalOpen, isViewOnly } = useSplitest();

  const navItems = [
    { id: 'wallet', label: 'Groups', icon: Users },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'expenses', label: 'Activity', icon: Receipt },
    { id: 'profile', label: 'Profile', icon: User },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-4 z-40 md:hidden select-none pb-safe transition-colors duration-150">
      <div className="flex items-center gap-1">
        {navItems.slice(0, 2).map((item) => {
          const isActive = currentView === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all ${
                isActive ? 'text-[#059669] dark:text-[#10B981] font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`px-3 py-1 rounded-full transition-all ${
                  isActive ? 'bg-[#D1FAE5] dark:bg-[#064E3B]/70' : 'bg-transparent'
                }`}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <span className="text-[10px] leading-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>

      {!isViewOnly && (
        <div className="relative -top-3">
          <button
            type="button"
            onClick={() => setIsAddExpenseModalOpen(true)}
            className="w-12 h-12 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
            aria-label="Add Expense"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1">
        {navItems.slice(2).map((item) => {
          const isActive = currentView === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all ${
                isActive ? 'text-[#059669] dark:text-[#10B981] font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`px-3 py-1 rounded-full transition-all ${
                  isActive ? 'bg-[#D1FAE5] dark:bg-[#064E3B]/70' : 'bg-transparent'
                }`}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <span className="text-[10px] leading-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
