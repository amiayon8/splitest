'use client';

import React, { useState, useMemo } from 'react';
import { useSplitest } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import {
  calculateMemberBalances,
  calculateSimplifiedDebts,
  calculateDirectDebts,
  getCurrentUserMemberName,
  isMemberCurrentUser,
} from '@/lib/split-calculator';
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Users,
  Copy,
  Check,
  Send,
  Handshake,
  Search,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Info,
  DollarSign,
  Share2,
} from 'lucide-react';

export function DebtFlowView() {
  const {
    groups,
    activeGroupId,
    activeGroup,
    setActiveGroupId,
    allExpenses,
    allSettlements,
    userProfile,
    isViewOnly,
    setIsSettleModalOpen,
    setSettlePrefill,
    sendChatMessage,
    showToast,
  } = useSplitest();

  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    activeGroupId || (groups[0]?.id || '')
  );
  const [calculationMode, setCalculationMode] = useState<'simplified' | 'direct'>('simplified');
  const [filterType, setFilterType] = useState<'all' | 'mine' | 'pay' | 'receive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [remindedCreditors, setRemindedCreditors] = useState<Record<string, boolean>>({});

  const currentGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || activeGroup || groups[0];
  }, [groups, selectedGroupId, activeGroup]);

  const groupCurrency = currentGroup?.defaultCurrency || 'USD';

  const groupExpenses = useMemo(() => {
    if (!currentGroup) return [];
    return allExpenses.filter((e) => e.groupId === currentGroup.id);
  }, [allExpenses, currentGroup]);

  const groupSettlements = useMemo(() => {
    if (!currentGroup) return [];
    return allSettlements.filter((s) => s.groupId === currentGroup.id);
  }, [allSettlements, currentGroup]);

  const memberNames = useMemo(() => {
    if (!currentGroup?.members) return [];
    return currentGroup.members.map((m) => m.name);
  }, [currentGroup]);

  const memberBalances = useMemo(() => {
    return calculateMemberBalances(memberNames, groupExpenses, groupSettlements);
  }, [memberNames, groupExpenses, groupSettlements]);

  const allDebts = useMemo(() => {
    if (calculationMode === 'simplified') {
      return calculateSimplifiedDebts(memberBalances);
    }
    return calculateDirectDebts(groupExpenses, groupSettlements);
  }, [calculationMode, memberBalances, groupExpenses, groupSettlements]);

  const currentMemberName = useMemo(() => {
    return getCurrentUserMemberName(currentGroup, userProfile);
  }, [currentGroup, userProfile]);

  const filteredDebts = useMemo(() => {
    let list = [...allDebts];

    if (filterType === 'mine') {
      list = list.filter(
        (d) =>
          isMemberCurrentUser(d.debtor, currentGroup, userProfile) ||
          isMemberCurrentUser(d.creditor, currentGroup, userProfile)
      );
    } else if (filterType === 'pay') {
      list = list.filter((d) => isMemberCurrentUser(d.debtor, currentGroup, userProfile));
    } else if (filterType === 'receive') {
      list = list.filter((d) => isMemberCurrentUser(d.creditor, currentGroup, userProfile));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) => d.debtor.toLowerCase().includes(q) || d.creditor.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allDebts, filterType, searchQuery, currentGroup, userProfile]);

  const memberAvatarMap = useMemo(() => {
    const map = new Map<string, string>();
    if (currentGroup?.members) {
      currentGroup.members.forEach((m) => {
        map.set(m.name.toLowerCase(), m.avatarUrl);
      });
    }
    return map;
  }, [currentGroup]);

  const totalOutstanding = useMemo(() => {
    return allDebts.reduce((sum, d) => sum + d.amount, 0);
  }, [allDebts]);

  const totalUserOwes = useMemo(() => {
    return allDebts
      .filter((d) => isMemberCurrentUser(d.debtor, currentGroup, userProfile))
      .reduce((sum, d) => sum + d.amount, 0);
  }, [allDebts, currentGroup, userProfile]);

  const totalUserIsOwed = useMemo(() => {
    return allDebts
      .filter((d) => isMemberCurrentUser(d.creditor, currentGroup, userProfile))
      .reduce((sum, d) => sum + d.amount, 0);
  }, [allDebts, currentGroup, userProfile]);

  const sortedMemberSummaries = useMemo(() => {
    return Object.values(memberBalances).sort((a, b) => b.netBalance - a.netBalance);
  }, [memberBalances]);

  const handleSettleDebt = (debtor: string, creditor: string, amount: number) => {
    setSettlePrefill({ recipient: creditor, amount });
    setIsSettleModalOpen(true);
  };

  const handleRemindDebt = (debtor: string, amount: number) => {
    const key = `${debtor}-${amount}`;
    const reminderText = `Payment Reminder: ${debtor} owes ${formatCurrency(amount, groupCurrency)} in ${currentGroup?.name || 'the group'}. Please settle when convenient.`;
    void sendChatMessage({
      groupId: currentGroup.id,
      content: reminderText,
    });
    setRemindedCreditors((prev) => ({ ...prev, [key]: true }));
    showToast(`Reminder sent to group chat for ${debtor}`);
  };

  const handleCopySummary = async () => {
    if (allDebts.length === 0) {
      showToast('No outstanding debts to copy');
      return;
    }

    const lines = [
      `Debt Flow Summary for ${currentGroup?.name || 'Group'}:`,
      ...allDebts.map(
        (d, index) =>
          `${index + 1}. ${d.debtor} gives ${formatCurrency(d.amount, groupCurrency)} to ${d.creditor}`
      ),
      '',
      `Total ledger balance: ${formatCurrency(totalOutstanding, groupCurrency)}`,
      `Generated via Splitest`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSummary(true);
      showToast('Debt flow summary copied to clipboard');
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      showToast('Could not copy to clipboard');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-[#090D16] select-none transition-colors duration-150">
      <div className="bg-white dark:bg-[#0F172A] border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-16 z-30 transition-colors">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#D1FAE5] dark:bg-[#064E3B]/70 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Debt Flow
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#D1FAE5] dark:bg-[#064E3B]/70 text-[#065F46] dark:text-[#A7F3D0]">
                {allDebts.length} {allDebts.length === 1 ? 'transfer' : 'transfers'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Visual transfers showing who will give how much to whom to settle the ledger
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative">
              <select
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  setActiveGroupId(e.target.value);
                }}
                aria-label="Select Group"
                className="h-10 pl-3.5 pr-8 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#059669] appearance-none cursor-pointer"
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id} className="dark:bg-[#1E293B] dark:text-slate-100">
                    {group.name} ({group.members.length} members)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleCopySummary}
              className="h-10 px-3.5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-4 h-4 text-[#059669] dark:text-[#10B981]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>

            {!isViewOnly && (
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(true)}
                className="h-10 px-4 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-98 transition-all"
              >
                <Handshake className="w-4 h-4" />
                <span>Settle Up</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total In Flow
            </span>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
                {formatCurrency(totalOutstanding, groupCurrency)}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Outstanding volume across {allDebts.length} {allDebts.length === 1 ? 'transfer' : 'transfers'}
            </p>
          </div>

          <div className="bg-[#FFE4E6]/60 dark:bg-[#881337]/30 rounded-3xl p-5 border border-[#FECDD3] dark:border-[#9F1239] shadow-xs transition-colors">
            <span className="text-xs font-semibold text-[#9F1239] dark:text-[#FECDD3] uppercase tracking-wider">
              You Need To Pay
            </span>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#9F1239] dark:text-[#FECDD3] tabular-nums tracking-tight">
                {formatCurrency(totalUserOwes, groupCurrency)}
              </span>
            </div>
            <p className="text-xs text-[#9F1239]/80 dark:text-[#FECDD3]/80 mt-1">
              {totalUserOwes > 0 ? 'Your direct pending transfers' : 'You have no payments due'}
            </p>
          </div>

          <div className="bg-[#D1FAE5]/60 dark:bg-[#064E3B]/30 rounded-3xl p-5 border border-[#A7F3D0] dark:border-[#047857] shadow-xs transition-colors">
            <span className="text-xs font-semibold text-[#065F46] dark:text-[#A7F3D0] uppercase tracking-wider">
              You Will Receive
            </span>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#065F46] dark:text-[#A7F3D0] tabular-nums tracking-tight">
                {formatCurrency(totalUserIsOwed, groupCurrency)}
              </span>
            </div>
            <p className="text-xs text-[#065F46]/80 dark:text-[#A7F3D0]/80 mt-1">
              {totalUserIsOwed > 0 ? 'Pending reimbursements to you' : 'No incoming transfers pending'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {[
              { id: 'all', label: 'All Transfers' },
              { id: 'mine', label: 'Involving Me' },
              { id: 'pay', label: 'I Give' },
              { id: 'receive', label: 'I Receive' },
            ].map((tab) => {
              const isSelected = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id as 'all' | 'mine' | 'pay' | 'receive')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#059669] text-white shadow-2xs'
                      : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by person..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 sm:w-48 h-8 pl-8 pr-3 rounded-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setCalculationMode(calculationMode === 'simplified' ? 'direct' : 'simplified')
              }
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                calculationMode === 'simplified'
                  ? 'bg-[#D1FAE5] dark:bg-[#064E3B]/70 text-[#065F46] dark:text-[#A7F3D0] border-[#A7F3D0] dark:border-[#059669]'
                  : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Mode: {calculationMode === 'simplified' ? 'Simplified Flow' : 'Direct Debts'}
            </button>
          </div>
        </div>

        {calculationMode === 'simplified' && (
          <div className="p-3.5 rounded-2xl bg-[#D1FAE5]/30 dark:bg-[#064E3B]/20 border border-[#A7F3D0]/60 dark:border-[#059669]/40 flex items-center gap-2.5 text-xs text-[#065F46] dark:text-[#A7F3D0]">
            <Sparkles className="w-4 h-4 shrink-0 text-[#059669] dark:text-[#10B981]" />
            <span>
              Simplified Debt Flow automatically cancels out circular payments so that members settle with the lowest possible number of transfers.
            </span>
          </div>
        )}

        <div className="space-y-3">
          {filteredDebts.length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 transition-colors">
              <CheckCircle2 className="w-12 h-12 text-[#059669] dark:text-[#10B981] mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {allDebts.length === 0 ? 'All Debts Settled' : 'No transfers match your filter'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {allDebts.length === 0
                  ? 'Everyone in this group is settled up. Record a new expense to see dynamic debt flows.'
                  : 'Try selecting a different filter or clearing the search query.'}
              </p>
            </div>
          ) : (
            filteredDebts.map((item, index) => {
              const isYouDebtor = isMemberCurrentUser(item.debtor, currentGroup, userProfile);
              const isYouCreditor = isMemberCurrentUser(item.creditor, currentGroup, userProfile);
              const debtorAvatar =
                memberAvatarMap.get(item.debtor.toLowerCase()) ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.debtor)}`;
              const creditorAvatar =
                memberAvatarMap.get(item.creditor.toLowerCase()) ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.creditor)}`;
              const reminderKey = `${item.debtor}-${item.amount}`;
              const isReminded = remindedCreditors[reminderKey];

              return (
                <div
                  key={`${item.debtor}-${item.creditor}-${index}`}
                  className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#1E293B] border transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isYouDebtor
                      ? 'border-[#FECDD3] dark:border-[#9F1239] ring-1 ring-[#FECDD3]/60 dark:ring-[#9F1239]/40'
                      : isYouCreditor
                      ? 'border-[#A7F3D0] dark:border-[#059669] ring-1 ring-[#A7F3D0]/60 dark:ring-[#059669]/40'
                      : 'border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 min-w-0">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <img
                        src={debtorAvatar}
                        alt={item.debtor}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.debtor}
                          </span>
                          {isYouDebtor && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FFE4E6] dark:bg-[#881337] text-[#9F1239] dark:text-[#FECDD3]">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-[#E11D48] dark:text-[#FB7185] block mt-0.5">
                          Gives / Pays
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-2.5 py-1 px-3 sm:px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <ArrowRight className="w-4 h-4 text-[#059669] dark:text-[#10B981] shrink-0" />
                      <div className="text-center sm:text-left">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums block">
                          {formatCurrency(item.amount, groupCurrency)}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Transfer Amount
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#059669] dark:text-[#10B981] shrink-0" />
                    </div>

                    <div className="flex items-center gap-3 min-w-[180px]">
                      <img
                        src={creditorAvatar}
                        alt={item.creditor}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.creditor}
                          </span>
                          {isYouCreditor && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#D1FAE5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0]">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-[#059669] dark:text-[#34D399] block mt-0.5">
                          Receives / Gets
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80">
                    {isYouDebtor && (
                      <button
                        type="button"
                        onClick={() => handleSettleDebt(item.debtor, item.creditor, item.amount)}
                        className="h-9 px-4 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Handshake className="w-3.5 h-3.5" />
                        <span>Settle Now</span>
                      </button>
                    )}

                    {isYouCreditor && (
                      <button
                        type="button"
                        onClick={() => handleRemindDebt(item.debtor, item.amount)}
                        disabled={isReminded}
                        className={`h-9 px-3.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isReminded
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            : 'bg-white dark:bg-[#1E293B] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5 text-[#059669] dark:text-[#10B981]" />
                        <span>{isReminded ? 'Reminder Sent' : 'Remind'}</span>
                      </button>
                    )}

                    {!isYouDebtor && !isYouCreditor && !isViewOnly && (
                      <button
                        type="button"
                        onClick={() => handleSettleDebt(item.debtor, item.creditor, item.amount)}
                        className="h-9 px-3.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Handshake className="w-3.5 h-3.5" />
                        <span>Record Settle</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Member Balance Position Ladder
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Net standing of each member based on total paid vs total fair share
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              {sortedMemberSummaries.length} members in ledger
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {sortedMemberSummaries.map((summary) => {
              const isCurrentUser = isMemberCurrentUser(summary.memberName, currentGroup, userProfile);
              const avatar =
                memberAvatarMap.get(summary.memberName.toLowerCase()) ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(summary.memberName)}`;
              const isCreditor = summary.netBalance > 0.01;
              const isDebtor = summary.netBalance < -0.01;

              return (
                <div
                  key={summary.memberName}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={avatar}
                      alt={summary.memberName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {summary.memberName}
                        </span>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#D1FAE5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0]">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                        Paid: {formatCurrency(summary.totalPaid, groupCurrency)} • Share: {formatCurrency(summary.totalOwed, groupCurrency)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-extrabold tabular-nums block ${
                        isCreditor
                          ? 'text-[#059669] dark:text-[#10B981]'
                          : isDebtor
                          ? 'text-[#E11D48] dark:text-[#FB7185]'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isCreditor
                        ? `+${formatCurrency(summary.netBalance, groupCurrency)}`
                        : isDebtor
                        ? `-${formatCurrency(Math.abs(summary.netBalance), groupCurrency)}`
                        : 'Settled'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      {isCreditor ? 'Gets Back' : isDebtor ? 'Owes Total' : 'Balanced'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
