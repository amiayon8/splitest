'use client';

import React, { useMemo, useState } from 'react';
import { useSplitest } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { calculateMemberBalances, calculateDirectDebts, getCurrentUserBalance, getCurrentUserMemberName, isMemberCurrentUser } from '@/lib/split-calculator';
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
  Search,
  UserCheck,
  Users,
} from 'lucide-react';

export function GroupsView() {
  const {
    groups,
    expenseGroups,
    activeGroupId,
    setActiveGroupId,
    allExpenses,
    allSettlements,
    setIsNewGroupModalOpen,
    setIsSettleModalOpen,
    setSettlePrefill,
    setCurrentView,
    segment,
    setSegment,
    activeCurrency,
    setIsLedgerSettingsModalOpen,
    isShareProfileModalOpen,
    setIsShareProfileModalOpen,
    isAddFriendModalOpen,
    setIsAddFriendModalOpen,
    allFriendsList,
    userProfile,
    showToast,
    startDirectChat,
  } = useSplitest();

  const [copiedLink, setCopiedLink] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');

  const groupBalances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const group of expenseGroups) {
      const gExpenses = allExpenses.filter((item) => item.groupId === group.id);
      const gSettlements = allSettlements.filter((item) => item.groupId === group.id);
      const memberNames = group.members.map((m) => m.name);
      const balances = calculateMemberBalances(memberNames, gExpenses, gSettlements);
      map[group.id] = getCurrentUserBalance(balances, group, userProfile)?.netBalance || 0;
    }
    return map;
  }, [expenseGroups, allExpenses, allSettlements, userProfile]);

  const friendsList = useMemo(() => {
    const friendsMap = new Map<
      string,
      { name: string; username?: string; avatarUrl: string; netBalance: number; groupCount: number }
    >();

    for (const group of groups) {
      const gExpenses = allExpenses.filter((item) => item.groupId === group.id);
      const gSettlements = allSettlements.filter((item) => item.groupId === group.id);
      const directDebts = calculateDirectDebts(gExpenses, gSettlements);

      for (const member of group.members) {
        if (
          isMemberCurrentUser(member.name, group, userProfile) ||
          (member.email && userProfile.email && member.email.toLowerCase() === userProfile.email.toLowerCase()) ||
          (member.userId && member.userId === userProfile.id)
        ) {
          continue;
        }

        const generatedUsername = member.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
        const current = friendsMap.get(member.name.toLowerCase()) || {
          name: member.name,
          username: generatedUsername,
          avatarUrl: member.avatarUrl,
          netBalance: 0,
          groupCount: 0,
        };

        let pairDebt = 0;
        for (const d of directDebts) {
          if (isMemberCurrentUser(d.creditor, group, userProfile) && d.debtor.toLowerCase() === member.name.toLowerCase()) {
            pairDebt += d.amount;
          } else if (isMemberCurrentUser(d.debtor, group, userProfile) && d.creditor.toLowerCase() === member.name.toLowerCase()) {
            pairDebt -= d.amount;
          }
        }

        current.netBalance += pairDebt;
        current.groupCount += 1;
        friendsMap.set(member.name.toLowerCase(), current);
      }
    }

    const myUsername = userProfile.username ? userProfile.username.toLowerCase() : "";
    const myFullName = userProfile.fullName ? userProfile.fullName.toLowerCase() : "";
    const myEmail = userProfile.email ? userProfile.email.toLowerCase() : "";

    allFriendsList.forEach((friend) => {
      const friendKey = (friend.username || friend.name || '').toLowerCase();
      if (!friendKey) return;

      const friendUsername = friend.username ? friend.username.toLowerCase() : "";
      const friendName = friend.name ? friend.name.toLowerCase() : "";
      const friendEmail = friend.email ? friend.email.toLowerCase() : "";

      const isMe =
        (Boolean(myUsername) && Boolean(friendUsername) && friendUsername === myUsername) ||
        (Boolean(myFullName) && Boolean(friendName) && friendName === myFullName) ||
        (Boolean(myEmail) && Boolean(friendEmail) && friendEmail === myEmail);
      if (isMe) return;

      const existingByName = friendsMap.get((friend.name || '').toLowerCase());
      const existingByKey = friendsMap.get(friendKey);
      const existing = existingByKey || existingByName;

      if (existing) {
        if (friend.username) existing.username = friend.username;
        if (friend.avatarUrl) existing.avatarUrl = friend.avatarUrl;
        if (friend.name && !existing.name) existing.name = friend.name;
        if (friend.groupCount) existing.groupCount = Math.max(existing.groupCount, friend.groupCount);
      } else {
        friendsMap.set(friendKey, {
          name: friend.name || friend.username || 'Friend',
          username: friend.username,
          avatarUrl: friend.avatarUrl || '',
          netBalance: friend.netBalance || 0,
          groupCount: friend.groupCount || 0,
        });
      }
    });

    return Array.from(friendsMap.values());
  }, [groups, allExpenses, allSettlements, allFriendsList, userProfile]);

  const filteredFriendsList = useMemo(() => {
    const query = friendSearchQuery.trim().toLowerCase().replace(/^@/, '');
    if (!query) return friendsList;
    return friendsList.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) ||
        (friend.username && friend.username.toLowerCase().includes(query))
    );
  }, [friendsList, friendSearchQuery]);

  const currentUsername =
    userProfile.username ||
    userProfile.paymentHandle ||
    (userProfile.fullName ? userProfile.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.') : 'user');
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
    <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto py-5 px-3.5 sm:px-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {segment === 'groups' ? 'Shared Ledgers & Groups' : 'Friends & Bilateral Debts'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {segment === 'groups'
              ? `${expenseGroups.length} active group ledgers linked to your account`
              : `${friendsList.length} connections across all shared ledgers`}
          </p>
        </div>

        {segment === 'groups' ? (
          <button
            type="button"
            onClick={() => setIsNewGroupModalOpen(true)}
            className="self-start sm:self-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all shadow-sm active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Group</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsShareProfileModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 text-primary" />
              <span>Share Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddFriendModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all shadow-sm active:scale-98 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Friend</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex sm:hidden items-center bg-[#F1F5F9] dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setSegment('groups')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            segment === 'groups'
              ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Groups ({expenseGroups.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSegment('friends')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            segment === 'friends'
              ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-primary" />
          <span>Friends ({friendsList.length})</span>
        </button>
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
            {expenseGroups.map((group) => {
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
          <div className="p-4 rounded-3xl bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-primary/10 border border-primary/20 dark:border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary tracking-wide uppercase">
                  Your Profile Link
                </span>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-medium truncate">
                  @{currentUsername}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Friends can add you instantly using your personal profile link
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleCopyProfileLink}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors shadow-xs active:scale-98"
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
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors shadow-xs active:scale-98"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={friendSearchQuery}
              onChange={(e) => setFriendSearchQuery(e.target.value)}
              placeholder="Search friends by name or @username..."
              className="w-full h-10 pl-10 pr-9 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors shadow-2xs"
            />
            {friendSearchQuery && (
              <button
                type="button"
                onClick={() => setFriendSearchQuery('')}
                className="absolute right-3 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 text-xs hover:bg-slate-300"
              >
                ×
              </button>
            )}
          </div>

          {filteredFriendsList.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-primary flex items-center justify-center mb-3">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {friendSearchQuery ? 'No matching friends found' : 'No friends connected yet'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {friendSearchQuery
                  ? `No friends matched "${friendSearchQuery}". Try a different name or username.`
                  : 'Add friends by their username or share your profile link to track shared expenses and balances.'}
              </p>
              {!friendSearchQuery && (
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddFriendModalOpen(true)}
                    className="px-4 py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all shadow-sm active:scale-98"
                  >
                    Add Friend
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShareProfileModalOpen(true)}
                    className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Share Profile
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
              {filteredFriendsList.map((friend) => (
                <div
                  key={friend.name}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0 flex-1">
                    <div className="flex items-center gap-3 min-w-0">
                      {friend.avatarUrl ? (
                        <img
                          src={friend.avatarUrl}
                          alt={friend.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs uppercase border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs">
                          {friend.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {friend.name}
                          </h3>
                          {friend.username && (
                            <a
                              href={`/u/${friend.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-primary hover:underline"
                            >
                              @{friend.username}
                            </a>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 block truncate">
                          {friend.groupCount > 0
                            ? `${friend.groupCount} shared ${friend.groupCount === 1 ? 'group' : 'groups'}`
                            : 'Connected friend'}
                        </span>
                      </div>
                    </div>

                    <div className="sm:hidden text-right shrink-0">
                      <span
                        className={`text-xs font-bold tabular-nums block ${
                          friend.netBalance > 0
                            ? 'text-[#059669] dark:text-[#34D399]'
                            : friend.netBalance < 0
                            ? 'text-[#E11D48] dark:text-[#FB7185]'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {friend.netBalance > 0
                          ? `+${formatCurrency(friend.netBalance, activeCurrency)}`
                          : friend.netBalance < 0
                          ? formatCurrency(friend.netBalance, activeCurrency)
                          : 'Settled'}
                      </span>
                      {friend.netBalance !== 0 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                          {friend.netBalance > 0 ? 'owes you' : 'you owe'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 shrink-0">
                    <div className="hidden sm:block text-right">
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

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          startDirectChat({
                            name: friend.name,
                            username: friend.username,
                            avatarUrl: friend.avatarUrl,
                          })
                        }
                        className="flex-1 sm:flex-initial px-3 py-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                        <span>Chat</span>
                      </button>

                      {friend.netBalance !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSettleFriend(friend.name, friend.netBalance)}
                          className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all shadow-xs active:scale-98 flex items-center justify-center"
                        >
                          <span>Settle</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

