'use client';

import React, { useMemo } from 'react';
import { useSplitest } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { calculateMemberBalances } from '@/lib/split-calculator';
import { WalletCardDeck } from '@/components/WalletCardDeck';
import {
  Plus,
  ArrowRight,
  Shield,
} from 'lucide-react';

export function GroupsView() {
  const {
    groups,
    activeGroupId,
    setActiveGroupId,
    allExpenses,
    allSettlements,
    setIsNewGroupModalOpen,
    setIsSettleModalOpen,
    setSettlePrefill,
    setCurrentView,
    segment,
    activeCurrency,
  } = useSplitest();

  const groupBalances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const group of groups) {
      const gExpenses = allExpenses.filter((item) => item.groupId === group.id);
      const gSettlements = allSettlements.filter((item) => item.groupId === group.id);
      const memberNames = group.members.map((m) => m.name);
      const balances = calculateMemberBalances(memberNames, gExpenses, gSettlements);
      map[group.id] = balances['You']?.netBalance || 0;
    }
    return map;
  }, [groups, allExpenses, allSettlements]);

  const friendsList = useMemo(() => {
    const friendsMap = new Map<string, { name: string; avatarUrl: string; netBalance: number; groupCount: number }>();

    for (const group of groups) {
      const gExpenses = allExpenses.filter((item) => item.groupId === group.id);
      const gSettlements = allSettlements.filter((item) => item.groupId === group.id);
      const memberNames = group.members.map((m) => m.name);
      const balances = calculateMemberBalances(memberNames, gExpenses, gSettlements);

      for (const member of group.members) {
        if (member.name === 'You') continue;
        const current = friendsMap.get(member.name) || {
          name: member.name,
          avatarUrl: member.avatarUrl,
          netBalance: 0,
          groupCount: 0,
        };
        const memberNet = balances[member.name]?.netBalance || 0;
        current.netBalance += -memberNet / (group.members.length > 1 ? group.members.length - 1 : 1);
        current.groupCount += 1;
        friendsMap.set(member.name, current);
      }
    }

    return Array.from(friendsMap.values());
  }, [groups, allExpenses, allSettlements]);

  const handleSelectGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    setCurrentView('wallet');
  };

  const handleSettleFriend = (friendName: string, amount: number) => {
    setSettlePrefill({ recipient: friendName, amount: Math.abs(amount) });
    setIsSettleModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-6 px-4 md:px-6 select-none">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {segment === 'groups' ? 'Shared Ledgers & Groups' : 'Friends & Bilateral Debts'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {segment === 'groups'
              ? `${groups.length} active group ledgers linked to your account`
              : `${friendsList.length} connections across all shared ledgers`}
          </p>
        </div>

        {segment === 'groups' && (
          <button
            type="button"
            onClick={() => setIsNewGroupModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all shadow-sm active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Group</span>
          </button>
        )}
      </div>

      {segment === 'groups' ? (
        <div className="flex flex-col gap-6">
          <WalletCardDeck />

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              All Group Ledgers
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Click any ledger to enter workspace
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group) => {
            const balance = groupBalances[group.id] || 0;
            const isCurrent = activeGroupId === group.id;

            return (
              <div
                key={group.id}
                onClick={() => handleSelectGroup(group.id)}
                className={`p-5 rounded-3xl border bg-white cursor-pointer transition-all hover:shadow-md flex flex-col justify-between gap-4 ${
                  isCurrent ? 'border-[#059669] ring-2 ring-emerald-100 shadow-xs' : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-[#065F46] flex items-center justify-center font-bold text-lg shrink-0">
                      {group.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{group.name}</h3>
                        {group.userRole === 'viewer' && (
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            View Only
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 mt-0.5 block">{group.category}</span>
                    </div>
                  </div>

                  <span
                    className={`text-sm font-bold tabular-nums shrink-0 ${
                      balance > 0
                        ? 'text-[#059669]'
                        : balance < 0
                        ? 'text-[#E11D48]'
                        : 'text-slate-500'
                    }`}
                  >
                    {balance > 0
                      ? `+${formatCurrency(balance, group.defaultCurrency || activeCurrency)}`
                      : balance < 0
                      ? formatCurrency(balance, group.defaultCurrency || activeCurrency)
                      : 'Settled'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {group.members.slice(0, 4).map((m) => (
                      <img
                        key={m.id}
                        src={m.avatarUrl}
                        alt={m.name}
                        className="w-6 h-6 rounded-full border-2 border-white object-cover"
                      />
                    ))}
                    {group.members.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-600">
                        +{group.members.length - 4}
                      </div>
                    )}
                  </div>

                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    {group.members.length} members
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 divide-y divide-slate-100 shadow-xs overflow-hidden">
          {friendsList.map((friend) => (
            <div key={friend.name} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={friend.avatarUrl}
                  alt={friend.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{friend.name}</h3>
                  <span className="text-xs text-slate-400">{friend.groupCount} shared groups</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span
                    className={`text-sm font-bold tabular-nums block ${
                      friend.netBalance > 0
                        ? 'text-[#059669]'
                        : friend.netBalance < 0
                        ? 'text-[#E11D48]'
                        : 'text-slate-400'
                    }`}
                  >
                    {friend.netBalance > 0
                      ? `owes you ${formatCurrency(friend.netBalance, activeCurrency)}`
                      : friend.netBalance < 0
                      ? `you owe ${formatCurrency(Math.abs(friend.netBalance), activeCurrency)}`
                      : 'Settled'}
                  </span>
                </div>

                {friend.netBalance !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleSettleFriend(friend.name, friend.netBalance)}
                    className="px-3 py-1.5 rounded-full bg-[#F1F5F9] hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    Settle
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
