'use client';

import React, { useMemo, useState } from 'react';
import { useSplitest } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { calculateMemberBalances } from '@/lib/split-calculator';
import { WalletCardDeck } from '@/components/WalletCardDeck';
import { buildProfileShareUrl } from '@/lib/users-directory';
import {
  Plus,
  ArrowRight,
  Shield,
  SlidersHorizontal,
  UserPlus,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
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
    setIsLedgerSettingsModalOpen,
    isShareProfileModalOpen,
    setIsShareProfileModalOpen,
    isAddFriendModalOpen,
    setIsAddFriendModalOpen,
    allFriendsList,
    userProfile,
    showToast,
  } = useSplitest();

  const [copiedLink, setCopiedLink] = useState(false);

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
    const friendsMap = new Map<
      string,
      { name: string; username?: string; avatarUrl: string; netBalance: number; groupCount: number }
    >();

    for (const group of groups) {
      const gExpenses = allExpenses.filter((item) => item.groupId === group.id);
      const gSettlements = allSettlements.filter((item) => item.groupId === group.id);
      const memberNames = group.members.map((m) => m.name);
      const balances = calculateMemberBalances(memberNames, gExpenses, gSettlements);

      for (const member of group.members) {
        if (member.name === 'You') continue;
        const generatedUsername = member.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
        const current = friendsMap.get(member.name.toLowerCase()) || {
          name: member.name,
          username: generatedUsername,
          avatarUrl: member.avatarUrl,
          netBalance: 0,
          groupCount: 0,
        };
        const memberNet = balances[member.name]?.netBalance || 0;
        current.netBalance += -memberNet / (group.members.length > 1 ? group.members.length - 1 : 1);
        current.groupCount += 1;
        friendsMap.set(member.name.toLowerCase(), current);
      }
    }

    allFriendsList.forEach((friend) => {
      const existing = friendsMap.get(friend.name.toLowerCase());
      if (existing) {
        existing.username = friend.username;
        if (friend.avatarUrl) existing.avatarUrl = friend.avatarUrl;
      } else {
        friendsMap.set(friend.name.toLowerCase(), {
          name: friend.name,
          username: friend.username,
          avatarUrl: friend.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          netBalance: 0,
          groupCount: friend.groupCount || 0,
        });
      }
    });

    return Array.from(friendsMap.values());
  }, [groups, allExpenses, allSettlements, allFriendsList]);

  const currentUsername = userProfile.username || userProfile.paymentHandle || 'you.splitest';
  const profileUrl = buildProfileShareUrl(currentUsername);

  const handleCopyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedLink(true);
      showToast('Profile link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('Could not copy link to clipboard');
    }
  };

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
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {segment === 'groups' ? 'Shared Ledgers & Groups' : 'Friends & Bilateral Debts'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {segment === 'groups'
              ? `${groups.length} active group ledgers linked to your account`
              : `${friendsList.length} connections across all shared ledgers`}
          </p>
        </div>

        {segment === 'groups' ? (
          <button
            type="button"
            onClick={() => setIsNewGroupModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all shadow-sm active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Group</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsShareProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-primary" />
              <span>Share Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddFriendModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all shadow-sm active:scale-98"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Friend</span>
            </button>
          </div>
        )}
      </div>

      {segment === 'groups' ? (
        <div className="flex flex-col gap-6">
          <WalletCardDeck />

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              All Group Ledgers
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
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
                  className={`p-5 rounded-3xl border bg-white dark:bg-[#1E293B] cursor-pointer transition-all hover:shadow-md flex flex-col justify-between gap-4 ${
                    isCurrent
                      ? 'border-[#059669] dark:border-[#10B981] ring-2 ring-emerald-100 dark:ring-emerald-950/60 shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B]/50 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center font-bold text-lg shrink-0">
                        {group.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {group.name}
                          </h3>
                          {group.userRole === 'viewer' && (
                            <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" />
                              View Only
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                          {group.category}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-sm font-bold tabular-nums shrink-0 ${
                        balance > 0
                          ? 'text-[#059669] dark:text-[#34D399]'
                          : balance < 0
                          ? 'text-[#E11D48] dark:text-[#FB7185]'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {balance > 0
                        ? `+${formatCurrency(balance, group.defaultCurrency || activeCurrency)}`
                        : balance < 0
                        ? formatCurrency(balance, group.defaultCurrency || activeCurrency)
                        : 'Settled'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {group.members.slice(0, 4).map((m) => (
                        <img
                          key={m.id}
                          src={m.avatarUrl}
                          alt={m.name}
                          className="w-6 h-6 rounded-full border-2 border-white dark:border-[#1E293B] object-cover"
                        />
                      ))}
                      {group.members.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#1E293B] flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300">
                          +{group.members.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveGroupId(group.id);
                          setIsLedgerSettingsModalOpen(true);
                        }}
                        className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
                        title="Ledger Settings"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                        {group.members.length} members
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-primary/10 border border-primary/20 dark:border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary tracking-wide uppercase">
                  Your Profile Link
                </span>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-medium">
                  @{currentUsername}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Friends can add you instantly using your personal profile link
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyProfileLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors shadow-xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsShareProfileModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
            {friendsList.map((friend) => (
              <div key={friend.name} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={friend.avatarUrl}
                    alt={friend.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {friend.name}
                      </h3>
                      {friend.username && (
                        <a
                          href={`/u/${friend.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-primary hover:underline truncate"
                        >
                          @{friend.username}
                        </a>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 block truncate">
                      {friend.groupCount > 0 ? `${friend.groupCount} shared groups` : 'Connected friend'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold tabular-nums block ${
                        friend.netBalance > 0
                          ? 'text-[#059669] dark:text-[#34D399]'
                          : friend.netBalance < 0
                          ? 'text-[#E11D48] dark:text-[#FB7185]'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {friend.netBalance > 0
                        ? `owes you ${formatCurrency(friend.netBalance, activeCurrency)}`
                        : friend.netBalance < 0
                        ? `you owe ${formatCurrency(Math.abs(friend.netBalance), activeCurrency)}`
                        : 'Settled'}
                    </span>
                  </div>

                  {friend.netBalance !== 0 ? (
                    <button
                      type="button"
                      onClick={() => handleSettleFriend(friend.name, friend.netBalance)}
                      className="px-3 py-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      Settle
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCurrentView('chat')}
                      className="px-3 py-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3 h-3 text-slate-500" />
                      <span>Chat</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

