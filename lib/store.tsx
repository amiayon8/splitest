'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Group, Expense, Settlement, ActivityFeedItem, UserProfile, GroupChatMessage, ChatAttachment, ThemeMode } from '@/types';
import { initialGroups, initialExpenses, initialSettlements } from '@/lib/initial-data';
import { getSupabaseClient, saveSupabaseConfig } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SplitestContextType {
  groups: Group[];
  activeGroupId: string;
  activeGroup: Group;
  setActiveGroupId: (id: string) => void;
  currentView: 'wallet' | 'expenses' | 'groups' | 'analytics' | 'settings' | 'profile' | 'chat';
  setCurrentView: (view: 'wallet' | 'expenses' | 'groups' | 'analytics' | 'settings' | 'profile' | 'chat') => void;
  expenses: Expense[];
  allExpenses: Expense[];
  settlements: Settlement[];
  allSettlements: Settlement[];
  selectedExpenseId: string | null;
  setSelectedExpenseId: (id: string | null) => void;
  selectedExpense: Expense | null;
  simplifyDebts: boolean;
  setSimplifyDebts: React.Dispatch<React.SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  sortOrder: 'latest' | 'highest' | 'lowest';
  setSortOrder: (order: 'latest' | 'highest' | 'lowest') => void;
  activeInspectorTab: 'balances' | 'spending' | 'activity';
  setActiveInspectorTab: (tab: 'balances' | 'spending' | 'activity') => void;
  activities: ActivityFeedItem[];
  supabaseStatus: 'connected' | 'simulated' | 'connecting' | 'error';
  isConfigModalOpen: boolean;
  setIsConfigModalOpen: (open: boolean) => void;
  isAddExpenseModalOpen: boolean;
  setIsAddExpenseModalOpen: (open: boolean) => void;
  isSettleModalOpen: boolean;
  setIsSettleModalOpen: (open: boolean) => void;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  currentGroup: Group;
  isViewOnly: boolean;
  activeCurrency: string;
  setActiveCurrency: (currency: string) => void;
  segment: 'groups' | 'friends';
  setSegment: (seg: 'groups' | 'friends') => void;
  settlePrefill: { recipient: string; amount: number } | null;
  setSettlePrefill: (prefill: { recipient: string; amount: number } | null) => void;
  isNewGroupModalOpen: boolean;
  setIsNewGroupModalOpen: (open: boolean) => void;
  toastMessage: string | null;
  showToast: (message: string) => void;
  addExpense: (expenseData: {
    groupId: string;
    description: string;
    amount: number;
    currencyCode?: string;
    exchangeRateToGroup?: number;
    category: Expense['category'];
    paidByName: string;
    splitMethod: Expense['splitMethod'];
    date: string;
    hasReceipt: boolean;
    splits: { memberName: string; shareAmount: number; percentage?: number; shares?: number }[];
  }) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addSettlement: (settlementData: {
    groupId: string;
    payerName: string;
    recipientName: string;
    amount: number;
    method: string;
    notes?: string;
  }) => Promise<void>;
  addComment: (expenseId: string, content: string, authorName?: string) => Promise<void>;
  createGroup: (name: string, category: string, icon: string, memberNames: string[]) => Promise<void>;
  updateSupabaseCredentials: (url: string, anonKey: string) => Promise<boolean>;
  clearSupabaseCredentials: () => void;
  sendPaymentReminders: () => void;
  exportGroupCsv: () => void;
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  syncGoogleAccount: () => Promise<boolean>;
  disconnectGoogleAccount: () => void;
  sendTestNotification: () => Promise<boolean>;
  chatMessages: GroupChatMessage[];
  allChatMessages: GroupChatMessage[];
  sendChatMessage: (data: { groupId: string; content: string; mentions?: string[]; attachment?: ChatAttachment }) => void;
  createGroupFromChat: (name: string, category: string, memberNames: string[]) => string;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const SplitestContext = createContext<SplitestContextType | null>(null);

const STORAGE_EXPENSES_KEY = 'splitest_local_expenses';
const STORAGE_SETTLEMENTS_KEY = 'splitest_local_settlements';
const STORAGE_GROUPS_KEY = 'splitest_local_groups';
const STORAGE_ACTIVITIES_KEY = 'splitest_local_activities';
const STORAGE_PROFILE_KEY = 'splitest_local_profile';
const STORAGE_CHAT_KEY = 'splitest_local_chat';
const STORAGE_THEME_KEY = 'splitest_theme_preference';

const initialProfile: UserProfile = {
  id: 'usr-current',
  email: 'you@example.com',
  fullName: 'Your Name',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  defaultCurrency: 'USD',
  phone: '+1 (555) 019-2834',
  paymentHandle: 'you.splitest',
  themePreference: 'system',
  googleConnected: true,
  googleEmail: 'you@gmail.com',
  notificationsEnabled: true,
  notifyOnExpense: true,
  notifyOnSettlement: true,
  notifyOnMention: true,
  notifyWeeklyDigest: false,
};

const initialChatMessages: GroupChatMessage[] = [
  {
    id: 'chat-1',
    groupId: 'group-bali-retreat',
    senderName: 'Alex Rivera',
    senderAvatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    senderIsCurrentUser: false,
    content: 'Welcome everyone to the Bali Villa retreat ledger! Keep receipts here.',
    mentions: [],
    createdAt: '2026-10-17T10:00:00.000Z',
  },
  {
    id: 'chat-2',
    groupId: 'group-bali-retreat',
    senderName: 'Liam Vance',
    senderAvatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    senderIsCurrentUser: false,
    content: 'I booked the private airport transfer for all of us.',
    mentions: [],
    attachment: {
      type: 'expense',
      referenceId: 'exp-villa-deposit',
      title: 'Airport Transfer Shuttle',
      amount: 85.0,
      currencyCode: 'USD',
      payerName: 'Liam Vance',
    },
    createdAt: '2026-10-17T11:15:00.000Z',
  },
  {
    id: 'chat-3',
    groupId: 'group-bali-retreat',
    senderName: 'Sophia Taylor',
    senderAvatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    senderIsCurrentUser: false,
    content: 'Thanks Liam! @You could you settle the villa groceries whenever ready?',
    mentions: ['You'],
    attachment: {
      type: 'borrow_request',
      title: 'Villa Groceries Reimbursement',
      amount: 45.0,
      currencyCode: 'USD',
      recipientName: 'Sophia Taylor',
    },
    createdAt: '2026-10-18T08:30:00.000Z',
  },
];

const defaultActivities: ActivityFeedItem[] = [
  {
    id: 'act-1',
    type: 'expense_created',
    title: 'You added Private Pool Villa Deposit',
    subtitle: 'Today at 2:45 PM • $540.00',
    timestamp: '2026-10-18T14:45:00.000Z',
    iconName: 'receipt',
    iconColorClass: 'text-primary',
  },
  {
    id: 'act-2',
    type: 'expense_created',
    title: 'Alex Rivera added Jimbaran Sunset Seafood Dinner',
    subtitle: 'Yesterday at 7:15 PM • $154.00',
    timestamp: '2026-10-17T19:15:00.000Z',
    iconName: 'restaurant',
    iconColorClass: 'text-secondary',
  },
  {
    id: 'act-3',
    type: 'settlement_recorded',
    title: 'Liam Vance settled with Sophia Taylor',
    subtitle: 'Oct 16 at 11:20 AM • $48.00',
    timestamp: '2026-10-16T11:20:00.000Z',
    iconName: 'handshake',
    iconColorClass: 'text-primary',
  },
];

export function SplitestProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<Group[]>(() => {
    if (typeof window === 'undefined') return initialGroups;
    try {
      const stored = window.localStorage.getItem(STORAGE_GROUPS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      return initialGroups;
    }
    return initialGroups;
  });

  const [activeGroupId, setActiveGroupId] = useState<string>('group-bali-retreat');
  const [currentView, setCurrentView] = useState<'wallet' | 'expenses' | 'groups' | 'analytics' | 'settings' | 'profile' | 'chat'>('wallet');

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (typeof window === 'undefined') return initialProfile;
    try {
      const stored = window.localStorage.getItem(STORAGE_PROFILE_KEY);
      if (stored) return { ...initialProfile, ...JSON.parse(stored) };
    } catch {
      return initialProfile;
    }
    return initialProfile;
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      const stored = window.localStorage.getItem(STORAGE_THEME_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored as ThemeMode;
      }
    } catch {
      return 'system';
    }
    return 'system';
  });

  const [allChatMessages, setAllChatMessages] = useState<GroupChatMessage[]>(() => {
    if (typeof window === 'undefined') return initialChatMessages;
    try {
      const stored = window.localStorage.getItem(STORAGE_CHAT_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      return initialChatMessages;
    }
    return initialChatMessages;
  });

  const chatMessages = useMemo(() => {
    return allChatMessages.filter((msg) => msg.groupId === activeGroupId);
  }, [allChatMessages, activeGroupId]);

  const [allExpenses, setAllExpenses] = useState<Expense[]>(() => {
    if (typeof window === 'undefined') return initialExpenses;
    try {
      const stored = window.localStorage.getItem(STORAGE_EXPENSES_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      return initialExpenses;
    }
    return initialExpenses;
  });

  const [allSettlements, setAllSettlements] = useState<Settlement[]>(() => {
    if (typeof window === 'undefined') return initialSettlements;
    try {
      const stored = window.localStorage.getItem(STORAGE_SETTLEMENTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      return initialSettlements;
    }
    return initialSettlements;
  });

  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>('exp-villa-deposit');
  const [simplifyDebts, setSimplifyDebts] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'highest' | 'lowest'>('latest');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'balances' | 'spending' | 'activity'>('balances');
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'simulated' | 'connecting' | 'error'>('simulated');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState<boolean>(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [segment, setSegment] = useState<'groups' | 'friends'>('groups');
  const [activeCurrency, setActiveCurrency] = useState<string>('USD');
  const [settlePrefill, setSettlePrefill] = useState<{ recipient: string; amount: number } | null>(null);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activities, setActivities] = useState<ActivityFeedItem[]>(() => {
    if (typeof window === 'undefined') return defaultActivities;
    try {
      const stored = window.localStorage.getItem(STORAGE_ACTIVITIES_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      return defaultActivities;
    }
    return defaultActivities;
  });

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3200);
  }, []);

  const broadcastLocalEvent = useCallback((type: string, payload: unknown) => {
    if (typeof window === 'undefined') return;
    try {
      const channel = new BroadcastChannel('splitest-realtime-channel');
      channel.postMessage({ type, payload, timestamp: Date.now() });
      channel.close();
    } catch {
      window.localStorage.setItem('splitest_sync_event', JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }, []);

  const saveToLocalStorage = useCallback(
    (newExpenses: Expense[], newSettlements: Settlement[], newGroups: Group[], newActivities: ActivityFeedItem[]) => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(newExpenses));
      window.localStorage.setItem(STORAGE_SETTLEMENTS_KEY, JSON.stringify(newSettlements));
      window.localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(newGroups));
      window.localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(newActivities));
    },
    []
  );

  const fetchSupabaseData = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setSupabaseStatus('simulated');
      return;
    }

    try {
      setSupabaseStatus('connecting');

      const [groupsResponse, membersResponse, expensesResponse, splitsResponse, settlementsResponse, commentsResponse] =
        await Promise.all([
          client.from('groups').select('*').order('created_at', { ascending: false }),
          client.from('group_members').select('*'),
          client.from('expenses').select('*').order('date', { ascending: false }),
          client.from('expense_splits').select('*'),
          client.from('settlements').select('*').order('created_at', { ascending: false }),
          client.from('comments').select('*').order('created_at', { ascending: true }),
        ]);

      if (groupsResponse.error) throw groupsResponse.error;

      if (groupsResponse.data && groupsResponse.data.length > 0) {
        const fetchedMembers = membersResponse.data || [];
        const builtGroups: Group[] = groupsResponse.data.map((item) => ({
          id: item.id,
          name: item.name,
          icon: item.icon || 'Users',
          category: item.category || 'Trip',
          description: item.description,
          defaultCurrency: item.default_currency || 'USD',
          simplifyDebts: item.simplify_debts ?? true,
          userRole: (item.user_role === 'owner' || item.user_role === 'editor' || item.user_role === 'viewer') ? item.user_role : 'editor',
          createdAt: item.created_at,
          members: fetchedMembers
            .filter((m) => m.group_id === item.id)
            .map((m) => ({
              id: m.id,
              groupId: m.group_id,
              name: m.name,
              email: m.email,
              avatarUrl: m.avatar_url,
              role: (m.role === 'owner' || m.role === 'editor' || m.role === 'viewer') ? m.role : 'editor',
              isCurrentUser: m.is_current_user || false,
            })),
        }));

        const fetchedSplits = splitsResponse.data || [];
        const fetchedComments = commentsResponse.data || [];

        const builtExpenses: Expense[] = (expensesResponse.data || []).map((exp) => ({
          id: exp.id,
          groupId: exp.group_id,
          description: exp.description,
          amount: Number(exp.amount),
          currencyCode: exp.currency_code || 'USD',
          exchangeRateToGroup: Number(exp.exchange_rate_to_group) || 1.0,
          category: exp.category,
          paidByName: exp.paid_by_name || 'You',
          splitMethod: exp.split_method,
          date: exp.date || exp.expense_date,
          hasReceipt: exp.has_receipt,
          createdAt: exp.created_at,
          splits: fetchedSplits
            .filter((s) => s.expense_id === exp.id)
            .map((s) => ({
              id: s.id,
              expenseId: s.expense_id,
              memberName: s.member_name,
              shareAmount: Number(s.share_amount),
              percentage: s.percentage ? Number(s.percentage) : undefined,
              shares: s.shares ? Number(s.shares) : undefined,
            })),
          comments: fetchedComments
            .filter((c) => c.expense_id === exp.id)
            .map((c) => ({
              id: c.id,
              expenseId: c.expense_id,
              authorName: c.author_name,
              content: c.content,
              createdAt: c.created_at,
            })),
        }));

        const builtSettlements: Settlement[] = (settlementsResponse.data || []).map((set) => ({
          id: set.id,
          groupId: set.group_id,
          payerName: set.payer_name,
          recipientName: set.recipient_name,
          amount: Number(set.amount),
          currencyCode: set.currency_code || 'USD',
          method: set.method,
          notes: set.notes,
          createdAt: set.created_at,
        }));

        setGroups(builtGroups);
        setAllExpenses(builtExpenses);
        setAllSettlements(builtSettlements);
        setSupabaseStatus('connected');
        showToast('Connected to Supabase with live realtime synchronization');
      } else {
        setSupabaseStatus('connected');
      }
    } catch {
      setSupabaseStatus('error');
    }
  }, [showToast]);

  useEffect(() => {
    const client = getSupabaseClient();
    let isCancelled = false;

    if (client) {
      setTimeout(() => {
        if (!isCancelled) {
          void fetchSupabaseData();
        }
      }, 0);
    }

    let broadcastChannel: BroadcastChannel | null = null;
    try {
      broadcastChannel = new BroadcastChannel('splitest-realtime-channel');
      broadcastChannel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'expense_added') {
          setAllExpenses((prev) => [payload as Expense, ...prev]);
          showToast(`Live update: Expense "${(payload as Expense).description}" added`);
        } else if (type === 'expense_deleted') {
          setAllExpenses((prev) => prev.filter((item) => item.id !== payload));
          showToast('Live update: Expense deleted');
        } else if (type === 'settlement_added') {
          setAllSettlements((prev) => [payload as Settlement, ...prev]);
          showToast(`Live update: Payment of $${(payload as Settlement).amount} recorded`);
        } else if (type === 'comment_added') {
          const { expenseId, comment } = payload as { expenseId: string; comment: Expense['comments'][0] };
          setAllExpenses((prev) =>
            prev.map((exp) => (exp.id === expenseId ? { ...exp, comments: [...exp.comments, comment] } : exp))
          );
        } else if (type === 'group_created') {
          setGroups((prev) => [payload as Group, ...prev]);
          showToast(`Live update: Group "${(payload as Group).name}" created`);
        }
      };
    } catch {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === 'splitest_sync_event' && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            if (parsed.type === 'expense_added') {
              setAllExpenses((prev) => [parsed.payload, ...prev]);
            }
          } catch {
            return;
          }
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => {
        window.removeEventListener('storage', handleStorage);
      };
    }

    return () => {
      isCancelled = true;
      broadcastChannel?.close();
    };
  }, [fetchSupabaseData, showToast]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    let expenseChannel: RealtimeChannel | null = null;
    let settlementChannel: RealtimeChannel | null = null;
    let commentsChannel: RealtimeChannel | null = null;
    let broadcastLiveChannel: RealtimeChannel | null = null;

    try {
      expenseChannel = client
        .channel('public:expenses')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
          fetchSupabaseData();
        })
        .subscribe();

      settlementChannel = client
        .channel('public:settlements')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () => {
          fetchSupabaseData();
        })
        .subscribe();

      commentsChannel = client
        .channel('public:comments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
          fetchSupabaseData();
        })
        .subscribe();

      broadcastLiveChannel = client
        .channel('splitest-presence-room')
        .on('broadcast', { event: 'ping' }, (payload) => {
          showToast(`Realtime peer event: ${payload.payload?.message || 'Activity synchronized'}`);
        })
        .subscribe();
    } catch {
      return;
    }

    return () => {
      if (expenseChannel) client.removeChannel(expenseChannel);
      if (settlementChannel) client.removeChannel(settlementChannel);
      if (commentsChannel) client.removeChannel(commentsChannel);
      if (broadcastLiveChannel) client.removeChannel(broadcastLiveChannel);
    };
  }, [fetchSupabaseData, showToast]);

  const activeGroup = useMemo(() => {
    return groups.find((item) => item.id === activeGroupId) || groups[0];
  }, [groups, activeGroupId]);

  const expenses = useMemo(() => {
    return allExpenses.filter((item) => item.groupId === activeGroupId);
  }, [allExpenses, activeGroupId]);

  const settlements = useMemo(() => {
    return allSettlements.filter((item) => item.groupId === activeGroupId);
  }, [allSettlements, activeGroupId]);

  const selectedExpense = useMemo(() => {
    if (!selectedExpenseId) return expenses[0] || null;
    return expenses.find((item) => item.id === selectedExpenseId) || expenses[0] || null;
  }, [expenses, selectedExpenseId]);

  const addExpense = useCallback(
    async (expenseData: {
      groupId: string;
      description: string;
      amount: number;
      currencyCode?: string;
      exchangeRateToGroup?: number;
      category: Expense['category'];
      paidByName: string;
      splitMethod: Expense['splitMethod'];
      date: string;
      hasReceipt: boolean;
      splits: { memberName: string; shareAmount: number; percentage?: number; shares?: number }[];
    }) => {
      const newId = `exp-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const newExpense: Expense = {
        id: newId,
        groupId: expenseData.groupId,
        description: expenseData.description,
        amount: Number(expenseData.amount),
        currencyCode: expenseData.currencyCode || 'USD',
        exchangeRateToGroup: expenseData.exchangeRateToGroup || 1.0,
        category: expenseData.category,
        paidByName: expenseData.paidByName,
        splitMethod: expenseData.splitMethod,
        date: expenseData.date,
        hasReceipt: expenseData.hasReceipt,
        splits: expenseData.splits.map((split, index) => ({
          id: `split-${newId}-${index}`,
          expenseId: newId,
          memberName: split.memberName,
          shareAmount: Number(split.shareAmount),
          percentage: split.percentage,
          shares: split.shares,
        })),
        comments: [],
        createdAt: nowIso,
      };

      const newActivity: ActivityFeedItem = {
        id: `act-${Date.now()}`,
        type: 'expense_created',
        title: `${expenseData.paidByName === 'You' ? 'You' : expenseData.paidByName} added ${expenseData.description}`,
        subtitle: `Just now • $${Number(expenseData.amount).toFixed(2)}`,
        timestamp: nowIso,
        iconName: 'receipt',
        iconColorClass: 'text-primary',
      };

      const updatedExpenses = [newExpense, ...allExpenses];
      const updatedActivities = [newActivity, ...activities];

      setAllExpenses(updatedExpenses);
      setActivities(updatedActivities);
      setSelectedExpenseId(newId);
      saveToLocalStorage(updatedExpenses, allSettlements, groups, updatedActivities);
      broadcastLocalEvent('expense_added', newExpense);
      showToast(`Expense "${expenseData.description}" added successfully`);

      const client = getSupabaseClient();
      if (client) {
        try {
          const { data: insertedExpense, error: expError } = await client
            .from('expenses')
            .insert({
              group_id: expenseData.groupId,
              description: expenseData.description,
              amount: expenseData.amount,
              category: expenseData.category,
              paid_by_name: expenseData.paidByName,
              split_method: expenseData.splitMethod,
              date: expenseData.date,
              has_receipt: expenseData.hasReceipt,
            })
            .select()
            .single();

          if (!expError && insertedExpense) {
            const splitsToInsert = expenseData.splits.map((s) => ({
              expense_id: insertedExpense.id,
              member_name: s.memberName,
              share_amount: s.shareAmount,
              percentage: s.percentage || 0,
              shares: s.shares || 1,
            }));
            await client.from('expense_splits').insert(splitsToInsert);
          }
        } catch {
          return;
        }
      }
    },
    [allExpenses, allSettlements, groups, activities, saveToLocalStorage, broadcastLocalEvent, showToast]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const updatedExpenses = allExpenses.filter((item) => item.id !== id);
      setAllExpenses(updatedExpenses);
      if (selectedExpenseId === id) {
        setSelectedExpenseId(updatedExpenses[0]?.id || null);
      }
      saveToLocalStorage(updatedExpenses, allSettlements, groups, activities);
      broadcastLocalEvent('expense_deleted', id);
      showToast('Expense removed');

      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('expenses').delete().eq('id', id);
        } catch {
          return;
        }
      }
    },
    [allExpenses, selectedExpenseId, allSettlements, groups, activities, saveToLocalStorage, broadcastLocalEvent, showToast]
  );

  const addSettlement = useCallback(
    async (settlementData: {
      groupId: string;
      payerName: string;
      recipientName: string;
      amount: number;
      method: string;
      notes?: string;
    }) => {
      const newId = `settle-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const newSettlement: Settlement = {
        id: newId,
        groupId: settlementData.groupId,
        payerName: settlementData.payerName,
        recipientName: settlementData.recipientName,
        amount: Number(settlementData.amount),
        currencyCode: 'USD',
        method: settlementData.method,
        notes: settlementData.notes,
        createdAt: nowIso,
      };

      const newActivity: ActivityFeedItem = {
        id: `act-${Date.now()}`,
        type: 'settlement_recorded',
        title: `${settlementData.payerName} paid ${settlementData.recipientName}`,
        subtitle: `Just now • $${Number(settlementData.amount).toFixed(2)} via ${settlementData.method}`,
        timestamp: nowIso,
        iconName: 'handshake',
        iconColorClass: 'text-primary',
      };

      const updatedSettlements = [newSettlement, ...allSettlements];
      const updatedActivities = [newActivity, ...activities];

      setAllSettlements(updatedSettlements);
      setActivities(updatedActivities);
      saveToLocalStorage(allExpenses, updatedSettlements, groups, updatedActivities);
      broadcastLocalEvent('settlement_added', newSettlement);
      showToast(`Payment of $${Number(settlementData.amount).toFixed(2)} recorded`);

      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('settlements').insert({
            group_id: settlementData.groupId,
            payer_name: settlementData.payerName,
            recipient_name: settlementData.recipientName,
            amount: settlementData.amount,
            method: settlementData.method,
            notes: settlementData.notes || '',
          });
        } catch {
          return;
        }
      }
    },
    [allExpenses, allSettlements, groups, activities, saveToLocalStorage, broadcastLocalEvent, showToast]
  );

  const addComment = useCallback(
    async (expenseId: string, content: string, authorName = 'You') => {
      const newComment = {
        id: `comm-${Date.now()}`,
        expenseId,
        authorName,
        content,
        createdAt: new Date().toISOString(),
      };

      const updatedExpenses = allExpenses.map((exp) =>
        exp.id === expenseId ? { ...exp, comments: [...exp.comments, newComment] } : exp
      );

      setAllExpenses(updatedExpenses);
      saveToLocalStorage(updatedExpenses, allSettlements, groups, activities);
      broadcastLocalEvent('comment_added', { expenseId, comment: newComment });
      showToast('Note added to expense');

      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('comments').insert({
            expense_id: expenseId,
            author_name: authorName,
            content,
          });
        } catch {
          return;
        }
      }
    },
    [allExpenses, allSettlements, groups, activities, saveToLocalStorage, broadcastLocalEvent, showToast]
  );

  const createGroup = useCallback(
    async (name: string, category: string, icon: string, memberNames: string[]) => {
      const newGroupId = `group-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const memberList = Array.from(new Set(['You', ...memberNames.filter(Boolean)]));
      const newGroup: Group = {
        id: newGroupId,
        name,
        icon: icon || 'Users',
        category,
        description: 'New shared workspace ledger',
        defaultCurrency: 'USD',
        simplifyDebts: true,
        userRole: 'owner',
        createdAt: nowIso,
        members: memberList.map((mName, index) => ({
          id: `member-${newGroupId}-${index}`,
          groupId: newGroupId,
          name: mName,
          email: `${mName.toLowerCase().replace(/\s+/g, '')}@splitest.app`,
          avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + index * 1000}?auto=format&fit=crop&w=160&q=80`,
          role: mName === 'You' ? 'owner' : 'editor',
          isCurrentUser: mName === 'You',
        })),
      };

      const updatedGroups = [newGroup, ...groups];
      setGroups(updatedGroups);
      setActiveGroupId(newGroupId);
      saveToLocalStorage(allExpenses, allSettlements, updatedGroups, activities);
      broadcastLocalEvent('group_created', newGroup);
      showToast(`Group "${name}" created`);

      const client = getSupabaseClient();
      if (client) {
        try {
          const { data: insertedGroup } = await client
            .from('groups')
            .insert({
              name,
              category,
              icon,
              description: newGroup.description,
            })
            .select()
            .single();

          if (insertedGroup) {
            const membersToInsert = newGroup.members.map((m) => ({
              group_id: insertedGroup.id,
              name: m.name,
              email: m.email,
              avatar_url: m.avatarUrl,
              role: m.role,
              is_current_user: m.isCurrentUser,
            }));
            await client.from('group_members').insert(membersToInsert);
          }
        } catch {
          return;
        }
      }
    },
    [groups, allExpenses, allSettlements, activities, saveToLocalStorage, broadcastLocalEvent, showToast]
  );

  const updateSupabaseCredentials = useCallback(
    async (url: string, anonKey: string) => {
      if (!url.trim() || !anonKey.trim()) return false;
      saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
      await fetchSupabaseData();
      return true;
    },
    [fetchSupabaseData]
  );

  const clearSupabaseCredentials = useCallback(() => {
    saveSupabaseConfig(null);
    setSupabaseStatus('simulated');
    showToast('Reverted to local realtime mode');
  }, [showToast]);

  const sendPaymentReminders = useCallback(() => {
    showToast('Friendly payment reminders sent to debtors with outstanding balances');
  }, [showToast]);

  const exportGroupCsv = useCallback(() => {
    const rows = [
      ['Date', 'Description', 'Category', 'Total Amount', 'Paid By', 'Split Method', 'Splits Breakdown'],
      ...expenses.map((exp) => [
        exp.date,
        `"${exp.description.replace(/"/g, '""')}"`,
        exp.category,
        exp.amount.toFixed(2),
        `"${exp.paidByName.replace(/"/g, '""')}"`,
        exp.splitMethod,
        `"${exp.splits.map((s) => `${s.memberName}: $${s.shareAmount.toFixed(2)}`).join('; ')}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeGroup.name.toLowerCase().replace(/\s+/g, '_')}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${expenses.length} expenses to CSV`);
  }, [expenses, activeGroup, showToast]);

  const updateUserProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      setUserProfile((prev) => {
        const updated = { ...prev, ...updates };
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(updated));
          } catch {
            // ignore
          }
        }
        return updated;
      });
      showToast('Profile updated');
    },
    [showToast]
  );

  const syncGoogleAccount = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });
        return true;
      } catch {
        // fallback
      }
    }

    updateUserProfile({
      googleConnected: true,
      googleEmail: userProfile.email.includes('@') ? userProfile.email : 'you@gmail.com',
    });
    showToast('Google account connected');
    return true;
  }, [updateUserProfile, userProfile.email, showToast]);

  const disconnectGoogleAccount = useCallback(() => {
    updateUserProfile({
      googleConnected: false,
      googleEmail: undefined,
    });
    showToast('Google account disconnected');
  }, [updateUserProfile, showToast]);

  const sendTestNotification = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        try {
          new Notification('Splitest Notification', {
            body: `${activeGroup.name}: Alex Rivera recorded an expense for $45.00`,
            icon: '/Splitest.svg',
          });
        } catch {
          // ignore
        }
      }
    }

    showToast(`Test notification sent: ${activeGroup.name}`);
    return true;
  }, [activeGroup.name, showToast]);

  const sendChatMessage = useCallback(
    (data: {
      groupId: string;
      content: string;
      mentions?: string[];
      attachment?: ChatAttachment;
    }) => {
      const newMessage: GroupChatMessage = {
        id: `chat-${Date.now()}`,
        groupId: data.groupId,
        senderName: userProfile.fullName || 'You',
        senderAvatarUrl: userProfile.avatarUrl,
        senderIsCurrentUser: true,
        content: data.content,
        mentions: data.mentions || [],
        attachment: data.attachment,
        createdAt: new Date().toISOString(),
      };

      setAllChatMessages((prev) => {
        const next = [...prev, newMessage];
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        return next;
      });

      broadcastLocalEvent('chat_message_added', newMessage);
      showToast('Message sent');
    },
    [userProfile, broadcastLocalEvent, showToast]
  );

  const createGroupFromChat = useCallback(
    (name: string, category: string, memberNames: string[]) => {
      const newGroupId = `group-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const memberList = Array.from(new Set(['You', ...memberNames.filter(Boolean)]));
      const newGroup: Group = {
        id: newGroupId,
        name,
        icon: 'Users',
        category,
        description: 'New chat ledger workspace',
        defaultCurrency: 'USD',
        simplifyDebts: true,
        userRole: 'owner',
        createdAt: nowIso,
        members: memberList.map((mName, index) => ({
          id: `member-${newGroupId}-${index}`,
          groupId: newGroupId,
          name: mName,
          email: `${mName.toLowerCase().replace(/\s+/g, '')}@splitest.app`,
          avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + index * 1000}?auto=format&fit=crop&w=160&q=80`,
          role: mName === 'You' ? 'owner' : 'editor',
          isCurrentUser: mName === 'You',
        })),
      };

      setGroups((prev) => {
        const updated = [newGroup, ...prev];
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(updated));
        }
        return updated;
      });

      setActiveGroupId(newGroupId);
      showToast(`Created new group ledger: ${name}`);
      return newGroupId;
    },
    [showToast]
  );

  const applyThemeToDocument = useCallback((mode: ThemeMode) => {
    if (typeof window === 'undefined') return;
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      setThemeState(newTheme);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_THEME_KEY, newTheme);
        } catch {
          // ignore
        }
      }
      applyThemeToDocument(newTheme);
      setUserProfile((prev) => {
        const updated = { ...prev, themePreference: newTheme };
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(updated));
          } catch {
            // ignore
          }
        }
        return updated;
      });
      showToast(`Theme set to ${newTheme}`);
    },
    [applyThemeToDocument, showToast]
  );

  useEffect(() => {
    applyThemeToDocument(theme);
    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyThemeToDocument('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme, applyThemeToDocument]);

  const contextValue = useMemo(
    () => ({
      groups,
      activeGroupId,
      activeGroup,
      setActiveGroupId,
      currentView,
      setCurrentView,
      expenses,
      allExpenses,
      settlements,
      allSettlements,
      selectedExpenseId,
      setSelectedExpenseId,
      selectedExpense,
      simplifyDebts,
      setSimplifyDebts,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      sortOrder,
      setSortOrder,
      activeInspectorTab,
      setActiveInspectorTab,
      activities,
      supabaseStatus,
      isConfigModalOpen,
      setIsConfigModalOpen,
      isAddExpenseModalOpen,
      setIsAddExpenseModalOpen,
      isSettleModalOpen,
      setIsSettleModalOpen,
      isShareModalOpen,
      setIsShareModalOpen,
      currentGroup: activeGroup,
      isViewOnly: activeGroup?.userRole === 'viewer',
      activeCurrency,
      setActiveCurrency,
      segment,
      setSegment,
      settlePrefill,
      setSettlePrefill,
      isNewGroupModalOpen,
      setIsNewGroupModalOpen,
      toastMessage,
      showToast,
      addExpense,
      deleteExpense,
      addSettlement,
      addComment,
      createGroup,
      updateSupabaseCredentials,
      clearSupabaseCredentials,
      sendPaymentReminders,
      exportGroupCsv,
      userProfile,
      updateUserProfile,
      syncGoogleAccount,
      disconnectGoogleAccount,
      sendTestNotification,
      chatMessages,
      allChatMessages,
      sendChatMessage,
      createGroupFromChat,
      theme,
      setTheme,
    }),
    [
      groups,
      activeGroupId,
      activeGroup,
      currentView,
      expenses,
      allExpenses,
      settlements,
      allSettlements,
      selectedExpenseId,
      selectedExpense,
      simplifyDebts,
      searchQuery,
      selectedCategory,
      sortOrder,
      activeInspectorTab,
      activities,
      supabaseStatus,
      isConfigModalOpen,
      isAddExpenseModalOpen,
      isSettleModalOpen,
      isShareModalOpen,
      activeCurrency,
      segment,
      settlePrefill,
      isNewGroupModalOpen,
      toastMessage,
      showToast,
      addExpense,
      deleteExpense,
      addSettlement,
      addComment,
      createGroup,
      updateSupabaseCredentials,
      clearSupabaseCredentials,
      sendPaymentReminders,
      exportGroupCsv,
      userProfile,
      updateUserProfile,
      syncGoogleAccount,
      disconnectGoogleAccount,
      sendTestNotification,
      chatMessages,
      allChatMessages,
      sendChatMessage,
      createGroupFromChat,
      theme,
      setTheme,
    ]
  );

  return <SplitestContext.Provider value={contextValue}>{children}</SplitestContext.Provider>;
}

export function useSplitest() {
  const context = useContext(SplitestContext);
  if (!context) {
    throw new Error('useSplitest must be used within a SplitestProvider');
  }
  return context;
}
