'use client';

import React from 'react';
import { useSplitest } from '@/lib/store';
import { Users, UserCheck, MessageSquare, ArrowLeftRight, User, Plus } from 'lucide-react';

export function MobileNavigation() {
  const { currentView, setCurrentView, setIsAddExpenseModalOpen, isViewOnly, segment, setSegment } = useSplitest();

  const isGroupsOrFriends = currentView === 'wallet' || currentView === 'groups';

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-5 items-center px-1 z-40 md:hidden select-none pb-safe transition-colors duration-150">
      <button
        type="button"
        onClick={() => {
          if (currentView === 'groups' && segment === 'friends') {
            setSegment('groups');
            setCurrentView('wallet');
          } else {
            setCurrentView('wallet');
          }
        }}
        className={`flex flex-col items-center justify-center py-1 transition-all ${
          isGroupsOrFriends
            ? 'text-[#059669] dark:text-[#10B981] font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
        }`}
      >
        <div
          className={`px-3 py-1 rounded-full transition-all ${
            isGroupsOrFriends ? 'bg-[#D1FAE5] dark:bg-[#064E3B]/70' : 'bg-transparent'
          }`}
        >
          {currentView === 'groups' && segment === 'friends' ? (
            <UserCheck className="w-5 h-5" />
          ) : (
            <Users className="w-5 h-5" />
          )}
        </div>
        <span className="text-[10px] leading-tight mt-0.5">
          {currentView === 'groups' && segment === 'friends' ? 'Friends' : 'Groups'}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setCurrentView('chat')}
        className={`flex flex-col items-center justify-center py-1 transition-all ${
          currentView === 'chat'
            ? 'text-[#059669] dark:text-[#10B981] font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
        }`}
      >
        <div
          className={`px-3 py-1 rounded-full transition-all ${
            currentView === 'chat' ? 'bg-[#D1FAE5] dark:bg-[#064E3B]/70' : 'bg-transparent'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </div>
        <span className="text-[10px] leading-tight mt-0.5">Chat</span>
      </button>

      <div className="flex items-center justify-center">
        {!isViewOnly ? (
          <button
            type="button"
            onClick={() => setIsAddExpenseModalOpen(true)}
            className="w-11 h-11 -mt-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
            aria-label="Add Expense"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        ) : (
          <div className="w-11 h-11 -mt-3" />
        )}
      </div>

      <button
        type="button"
        onClick={() => setCurrentView('debts')}
        className={`flex flex-col items-center justify-center py-1 transition-all ${
          currentView === 'debts'
            ? 'text-[#059669] dark:text-[#10B981] font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
        }`}
      >
        <div
          className={`px-3 py-1 rounded-full transition-all ${
            currentView === 'debts' ? 'bg-[#D1FAE5] dark:bg-[#064E3B]/70' : 'bg-transparent'
          }`}
        >
          <ArrowLeftRight className="w-5 h-5" />
        </div>
        <span className="text-[10px] leading-tight mt-0.5">Flow</span>
      </button>

      <button
        type="button"
        onClick={() => setCurrentView('profile')}
        className={`flex flex-col items-center justify-center py-1 transition-all ${
          currentView === 'profile'
            ? 'text-[#059669] dark:text-[#10B981] font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
        }`}
      >
        <div
          className={`px-3 py-1 rounded-full transition-all ${
            currentView === 'profile' ? 'bg-[#D1FAE5] dark:bg-[#064E3B]/70' : 'bg-transparent'
          }`}
        >
          <User className="w-5 h-5" />
        </div>
        <span className="text-[10px] leading-tight mt-0.5">Profile</span>
      </button>
    </nav>
  );
}
