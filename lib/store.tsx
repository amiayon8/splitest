'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Group,
  GroupMember,
  Expense,
  Settlement,
  ActivityFeedItem,
  UserProfile,
  GroupChatMessage,
  ChatAttachment,
  ThemeMode,
  FriendContact,
} from '@/types';
import { initialGroups, initialExpenses, initialSettlements } from '@/lib/initial-data';
import { getSupabaseClient, saveSupabaseConfig, isSupabaseConfigured } from '@/lib/supabase';
import { findUserByUsername, PRESET_USERS_DIRECTORY } from '@/lib/users-directory';
import {
  cacheItems,
  getCachedItems,
  setCachedItem,
  deleteCachedItem,
  queueMutation,
  getPendingMutations,
  removePendingMutation,
  countPendingMutations,
  useOnlineStatus,
  QueuedMutation,
} from '@/lib/offlineQueue';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

interface SplitestContextType {
  groups: Group[];
  activeGroupId: string;
  activeGroup: Group;
  setActiveGroupId: (id: string) => void;
  currentView: 'wallet' | 'expenses' | 'groups' | 'analytics' | 'profile' | 'chat';
  setCurrentView: (view: 'wallet' | 'expenses' | 'groups' | 'analytics' | 'profile' | 'chat') => void;
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
  supabaseStatus: 'connected' | 'simulated' | 'connecting' | 'error' | 'offline';
  pendingSyncCount: number;
  isOffline: boolean;
  syncNow: () => Promise<void>;
  isConfigModalOpen: boolean;
  setIsConfigModalOpen: (open: boolean) => void;
  isAddExpenseModalOpen: boolean;
  setIsAddExpenseModalOpen: (open: boolean) => void;
  isSettleModalOpen: boolean;
  setIsSettleModalOpen: (open: boolean) => void;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  isLedgerSettingsModalOpen: boolean;
  setIsLedgerSettingsModalOpen: (open: boolean) => void;
  isShareProfileModalOpen: boolean;
  setIsShareProfileModalOpen: (open: boolean) => void;
  isAddFriendModalOpen: boolean;
  setIsAddFriendModalOpen: (open: boolean) => void;
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
  allFriendsList: FriendContact[];
  addFriendDirectly: (friend: FriendContact) => void;
  addFriendByUsername: (query: string) => { success: boolean; friend?: FriendContact; message: string };
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
  updateGroup: (groupId: string, updates: Partial<Group>) => Promise<void>;
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
  addMembersToGroup: (groupId: string, newMemberNames: string[]) => void;
  toggleChatMessageLike: (messageId: string) => void;
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
const STORAGE_FRIENDS_KEY = 'splitest_local_friends';

const initialProfile: UserProfile = {
  id: 'usr-current',
  username: 'you.splitest',
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
  const isOnline = useOnlineStatus();

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
  const [currentView, setCurrentView] = useState<'wallet' | 'expenses' | 'groups' | 'analytics' | 'profile' | 'chat'>('wallet');

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
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'simulated' | 'connecting' | 'error' | 'offline'>('simulated');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState<boolean>(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isLedgerSettingsModalOpen, setIsLedgerSettingsModalOpen] = useState<boolean>(false);
  const [isShareProfileModalOpen, setIsShareProfileModalOpen] = useState<boolean>(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState<boolean>(false);
  const [segment, setSegment] = useState<'groups' | 'friends'>('groups');
  const [settlePrefill, setSettlePrefill] = useState<{ recipient: string; amount: number } | null>(null);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [customFriends, setCustomFriends] = useState<FriendContact[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(STORAGE_FRIENDS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      return [];
    }
    return [];
  });

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

  const refreshPendingCount = useCallback(async () => {
    const count = await countPendingMutations();
    setPendingSyncCount(count);
  }, []);

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  const saveToLocalStorage = useCallback(
    (
      newExpenses: Expense[],
      newSettlements: Settlement[],
      newGroups: Group[],
      newActivities: ActivityFeedItem[],
      newChat?: GroupChatMessage[],
      newFriends?: FriendContact[],
      newProfile?: UserProfile
    ) => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(newExpenses));
      window.localStorage.setItem(STORAGE_SETTLEMENTS_KEY, JSON.stringify(newSettlements));
      window.localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(newGroups));
      window.localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(newActivities));
      if (newChat) window.localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(newChat));
      if (newFriends) window.localStorage.setItem(STORAGE_FRIENDS_KEY, JSON.stringify(newFriends));
      if (newProfile) window.localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(newProfile));

      void cacheItems('groups', newGroups);
      void cacheItems('expenses', newExpenses);
      void cacheItems('settlements', newSettlements);
      void cacheItems('activities', newActivities);
      if (newChat) void cacheItems('chat_messages', newChat);
      if (newFriends) void cacheItems('friends', newFriends);
      if (newProfile) void setCachedItem('profiles', newProfile);
    },
    []
  );

  const seedInitialDataToSupabase = useCallback(
    async (client: SupabaseClient) => {
      try {
        for (const group of initialGroups) {
          await client.from('groups').upsert({
            id: group.id,
            name: group.name,
            icon: group.icon,
            category: group.category,
            description: group.description,
            default_currency: group.defaultCurrency,
            simplify_debts: group.simplifyDebts,
            user_role: group.userRole,
            created_at: group.createdAt,
          });

          const membersToInsert = group.members.map((m) => ({
            id: m.id,
            group_id: group.id,
            name: m.name,
            email: m.email,
            avatar_url: m.avatarUrl,
            role: m.role,
            is_current_user: m.isCurrentUser,
          }));
          await client.from('group_members').upsert(membersToInsert);
        }

        for (const exp of initialExpenses) {
          await client.from('expenses').upsert({
            id: exp.id,
            group_id: exp.groupId,
            description: exp.description,
            category: exp.category,
            amount: exp.amount,
            currency_code: exp.currencyCode,
            exchange_rate_to_group: exp.exchangeRateToGroup,
            paid_by_name: exp.paidByName,
            split_method: exp.splitMethod,
            date: exp.date,
            has_receipt: exp.hasReceipt,
            created_at: exp.createdAt,
          });

          const splitsToInsert = exp.splits.map((s) => ({
            id: s.id,
            expense_id: exp.id,
            member_name: s.memberName,
            share_amount: s.shareAmount,
            percentage: s.percentage || null,
            shares: s.shares || null,
          }));
          await client.from('expense_splits').upsert(splitsToInsert);
        }

        for (const set of initialSettlements) {
          await client.from('settlements').upsert({
            id: set.id,
            group_id: set.groupId,
            payer_name: set.payerName,
            recipient_name: set.recipientName,
            amount: set.amount,
            currency_code: set.currencyCode,
            method: set.method,
            notes: set.notes || '',
            created_at: set.createdAt,
          });
        }

        for (const chat of initialChatMessages) {
          await client.from('chat_messages').upsert({
            id: chat.id,
            group_id: chat.groupId,
            sender_name: chat.senderName,
            sender_avatar_url: chat.senderAvatarUrl,
            sender_is_current_user: chat.senderIsCurrentUser,
            content: chat.content,
            mentions: chat.mentions || [],
            attachment: chat.attachment || null,
            likes: chat.likes || [],
            created_at: chat.createdAt,
          });
        }
      } catch {
        return;
      }
    },
    []
  );

  const applyPendingMutation = useCallback(
    async (client: SupabaseClient, mutation: QueuedMutation): Promise<boolean> => {
      try {
        switch (mutation.type) {
          case 'create_expense': {
            const exp = mutation.payload as unknown as Expense;
            const { error: expError } = await client.from('expenses').upsert({
              id: exp.id,
              group_id: exp.groupId,
              description: exp.description,
              amount: exp.amount,
              currency_code: exp.currencyCode || 'USD',
              exchange_rate_to_group: exp.exchangeRateToGroup || 1.0,
              category: exp.category,
              paid_by_name: exp.paidByName,
              split_method: exp.splitMethod,
              date: exp.date,
              has_receipt: exp.hasReceipt,
              created_at: exp.createdAt,
            });
            if (expError) return false;

            if (exp.splits && exp.splits.length > 0) {
              const splitsPayload = exp.splits.map((s) => ({
                id: s.id,
                expense_id: exp.id,
                member_name: s.memberName,
                share_amount: s.shareAmount,
                percentage: s.percentage || null,
                shares: s.shares || null,
              }));
              await client.from('expense_splits').upsert(splitsPayload);
            }
            return true;
          }
          case 'delete_expense': {
            const { id } = mutation.payload as { id: string };
            const { error } = await client.from('expenses').delete().eq('id', id);
            return !error;
          }
          case 'record_settlement': {
            const set = mutation.payload as unknown as Settlement;
            const { error } = await client.from('settlements').upsert({
              id: set.id,
              group_id: set.groupId,
              payer_name: set.payerName,
              recipient_name: set.recipientName,
              amount: set.amount,
              currency_code: set.currencyCode || 'USD',
              method: set.method,
              notes: set.notes || '',
              created_at: set.createdAt,
            });
            return !error;
          }
          case 'create_group': {
            const grp = mutation.payload as unknown as Group;
            const { error: grpError } = await client.from('groups').upsert({
              id: grp.id,
              name: grp.name,
              icon: grp.icon,
              category: grp.category,
              description: grp.description,
              default_currency: grp.defaultCurrency,
              simplify_debts: grp.simplifyDebts,
              user_role: grp.userRole,
              created_at: grp.createdAt,
            });
            if (grpError) return false;

            if (grp.members && grp.members.length > 0) {
              const membersPayload = grp.members.map((m) => ({
                id: m.id,
                group_id: grp.id,
                name: m.name,
                email: m.email,
                avatar_url: m.avatarUrl,
                role: m.role,
                is_current_user: m.isCurrentUser,
              }));
              await client.from('group_members').upsert(membersPayload);
            }
            return true;
          }
          case 'update_group': {
            const { groupId, updates } = mutation.payload as {
              groupId: string;
              updates: Partial<Group>;
            };
            const payload: Record<string, unknown> = {};
            if (updates.name !== undefined) payload.name = updates.name;
            if (updates.category !== undefined) payload.category = updates.category;
            if (updates.defaultCurrency !== undefined) payload.default_currency = updates.defaultCurrency;
            if (updates.simplifyDebts !== undefined) payload.simplify_debts = updates.simplifyDebts;
            if (updates.icon !== undefined) payload.icon = updates.icon;
            const { error } = await client.from('groups').update(payload).eq('id', groupId);
            return !error;
          }
          case 'send_chat_message': {
            const chat = mutation.payload as unknown as GroupChatMessage;
            const { error } = await client.from('chat_messages').upsert({
              id: chat.id,
              group_id: chat.groupId,
              sender_name: chat.senderName,
              sender_avatar_url: chat.senderAvatarUrl,
              sender_is_current_user: chat.senderIsCurrentUser,
              content: chat.content,
              mentions: chat.mentions || [],
              attachment: chat.attachment || null,
              likes: chat.likes || [],
              created_at: chat.createdAt,
            });
            return !error;
          }
          case 'toggle_chat_like': {
            const { messageId, likes } = mutation.payload as {
              messageId: string;
              likes: string[];
            };
            const { error } = await client.from('chat_messages').update({ likes }).eq('id', messageId);
            return !error;
          }
          case 'add_comment': {
            const { expenseId, comment } = mutation.payload as {
              expenseId: string;
              comment: { id: string; authorName: string; content: string; createdAt: string };
            };
            const { error } = await client.from('comments').upsert({
              id: comment.id,
              expense_id: expenseId,
              author_name: comment.authorName,
              content: comment.content,
              created_at: comment.createdAt,
            });
            return !error;
          }
          case 'update_profile': {
            const profile = mutation.payload as unknown as UserProfile;
            const { error } = await client.from('profiles').upsert({
              id: profile.id,
              email: profile.email,
              full_name: profile.fullName,
              username: profile.username,
              avatar_url: profile.avatarUrl,
              default_currency: profile.defaultCurrency,
              phone: profile.phone,
              payment_handle: profile.paymentHandle,
              theme_preference: profile.themePreference,
              google_connected: profile.googleConnected,
              google_email: profile.googleEmail,
              notifications_enabled: profile.notificationsEnabled,
              notify_on_expense: profile.notifyOnExpense,
              notify_on_settlement: profile.notifyOnSettlement,
              notify_on_mention: profile.notifyOnMention,
              notify_weekly_digest: profile.notifyWeeklyDigest,
            });
            return !error;
          }
          case 'add_friend': {
            const friend = mutation.payload as unknown as FriendContact;
            const { error } = await client.from('friends').upsert({
              id: friend.id,
              name: friend.name,
              username: friend.username,
              email: friend.email,
              avatar_url: friend.avatarUrl,
              phone: '',
              added_via: friend.addedVia || 'directory',
            });
            return !error;
          }
          default:
            return true;
        }
      } catch {
        return false;
      }
    },
    []
  );

  const processOfflineQueue = useCallback(
    async (client: SupabaseClient) => {
      const pending = await getPendingMutations();
      if (!pending || pending.length === 0) return 0;

      let syncedCount = 0;
      for (const item of pending) {
        const success = await applyPendingMutation(client, item);
        if (success) {
          await removePendingMutation(item.id);
          syncedCount++;
        }
      }

      await refreshPendingCount();
      return syncedCount;
    },
    [applyPendingMutation, refreshPendingCount]
  );

  const fetchSupabaseData = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setSupabaseStatus(isOnline ? 'simulated' : 'offline');
      return;
    }

    if (!isOnline) {
      setSupabaseStatus('offline');
      return;
    }

    try {
      setSupabaseStatus('connecting');

      const synced = await processOfflineQueue(client);
      if (synced > 0) {
        showToast(`Synced ${synced} offline changes with cloud database`);
      }

      const [
        groupsResponse,
        membersResponse,
        expensesResponse,
        splitsResponse,
        settlementsResponse,
        commentsResponse,
        chatResponse,
        friendsResponse,
      ] = await Promise.all([
        client.from('groups').select('*').order('created_at', { ascending: false }),
        client.from('group_members').select('*'),
        client.from('expenses').select('*').order('date', { ascending: false }),
        client.from('expense_splits').select('*'),
        client.from('settlements').select('*').order('created_at', { ascending: false }),
        client.from('comments').select('*').order('created_at', { ascending: true }),
        client.from('chat_messages').select('*').order('created_at', { ascending: true }),
        client.from('friends').select('*').order('created_at', { ascending: false }),
      ]);

      if (groupsResponse.error) throw groupsResponse.error;

      if (!groupsResponse.data || groupsResponse.data.length === 0) {
        await seedInitialDataToSupabase(client);
        setSupabaseStatus('connected');
        showToast('Initialized cloud database with ledger data');
        return;
      }

      const fetchedMembers = membersResponse.data || [];
      const builtGroups: Group[] = groupsResponse.data.map((item) => ({
        id: item.id,
        name: item.name,
        icon: item.icon || 'Users',
        category: item.category || 'Trip',
        description: item.description,
        defaultCurrency: item.default_currency || 'USD',
        simplifyDebts: item.simplify_debts ?? true,
        userRole:
          item.user_role === 'owner' || item.user_role === 'editor' || item.user_role === 'viewer'
            ? item.user_role
            : 'editor',
        createdAt: item.created_at,
        members: fetchedMembers
          .filter((m) => m.group_id === item.id)
          .map((m) => ({
            id: m.id,
            groupId: m.group_id,
            name: m.name,
            email: m.email,
            avatarUrl: m.avatar_url,
            role: m.role === 'owner' || m.role === 'editor' || m.role === 'viewer' ? m.role : 'editor',
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
        splitMethod: exp.split_method || 'equal',
        date: exp.date,
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

      const builtChatMessages: GroupChatMessage[] = (chatResponse.data || []).map((c) => ({
        id: c.id,
        groupId: c.group_id,
        senderName: c.sender_name,
        senderAvatarUrl: c.sender_avatar_url,
        senderIsCurrentUser: c.sender_is_current_user,
        content: c.content,
        mentions: c.mentions || [],
        attachment: c.attachment || undefined,
        likes: c.likes || [],
        createdAt: c.created_at,
      }));

      const builtFriends: FriendContact[] = (friendsResponse.data || []).map((f) => ({
        id: f.id,
        name: f.name,
        username: f.username || f.name.toLowerCase().replace(/[^a-z0-9]/g, '.'),
        email: f.email || '',
        avatarUrl: f.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        netBalance: Number(f.net_balance) || 0,
        groupCount: Number(f.group_count) || 0,
        addedVia: f.added_via || 'directory',
      }));

      setGroups(builtGroups);
      setAllExpenses(builtExpenses);
      setAllSettlements(builtSettlements);
      if (builtChatMessages.length > 0) {
        setAllChatMessages(builtChatMessages);
      }
      if (builtFriends.length > 0) {
        setCustomFriends(builtFriends);
      }
      setSupabaseStatus('connected');

      saveToLocalStorage(
        builtGroups.length > 0 ? builtExpenses : allExpenses,
        builtSettlements,
        builtGroups,
        activities,
        builtChatMessages.length > 0 ? builtChatMessages : allChatMessages,
        builtFriends.length > 0 ? builtFriends : customFriends
      );
    } catch {
      setSupabaseStatus('error');
    }
  }, [
    isOnline,
    processOfflineQueue,
    showToast,
    seedInitialDataToSupabase,
    saveToLocalStorage,
    allExpenses,
    activities,
    allChatMessages,
    customFriends,
  ]);

  const syncNow = useCallback(async () => {
    await fetchSupabaseData();
  }, [fetchSupabaseData]);

  useEffect(() => {
    if (!isOnline) {
      setSupabaseStatus('offline');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setSupabaseStatus('simulated');
      return;
    }

    void fetchSupabaseData();
  }, [isOnline, fetchSupabaseData]);

  useEffect(() => {
    async function loadOfflineCachedData() {
      if (typeof window === 'undefined') return;
      try {
        const cachedGroups = await getCachedItems<Group>('groups');
        const cachedExpenses = await getCachedItems<Expense>('expenses');
        const cachedSettlements = await getCachedItems<Settlement>('settlements');
        const cachedChat = await getCachedItems<GroupChatMessage>('chat_messages');
        const cachedFriends = await getCachedItems<FriendContact>('friends');
        const cachedActivities = await getCachedItems<ActivityFeedItem>('activities');

        if (cachedGroups && cachedGroups.length > 0) setGroups(cachedGroups);
        if (cachedExpenses && cachedExpenses.length > 0) setAllExpenses(cachedExpenses);
        if (cachedSettlements && cachedSettlements.length > 0) setAllSettlements(cachedSettlements);
        if (cachedChat && cachedChat.length > 0) setAllChatMessages(cachedChat);
        if (cachedFriends && cachedFriends.length > 0) setCustomFriends(cachedFriends);
        if (cachedActivities && cachedActivities.length > 0) setActivities(cachedActivities);
      } catch {
        return;
      }
    }
    void loadOfflineCachedData();
  }, []);

  useEffect(() => {
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      broadcastChannel = new BroadcastChannel('splitest-realtime-channel');
      broadcastChannel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'expense_added') {
          setAllExpenses((prev) => [payload as Expense, ...prev]);
        } else if (type === 'expense_deleted') {
          setAllExpenses((prev) => prev.filter((item) => item.id !== payload));
        } else if (type === 'settlement_added') {
          setAllSettlements((prev) => [payload as Settlement, ...prev]);
        } else if (type === 'comment_added') {
          const { expenseId, comment } = payload as { expenseId: string; comment: Expense['comments'][0] };
          setAllExpenses((prev) =>
            prev.map((exp) => (exp.id === expenseId ? { ...exp, comments: [...exp.comments, comment] } : exp))
          );
        } else if (type === 'group_created') {
          setGroups((prev) => [payload as Group, ...prev]);
        } else if (type === 'chat_message_added') {
          setAllChatMessages((prev) => [...prev, payload as GroupChatMessage]);
        }
      };
    } catch {
      return;
    }

    return () => {
      broadcastChannel?.close();
    };
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !isOnline) return;

    let groupChannel: RealtimeChannel | null = null;
    let expenseChannel: RealtimeChannel | null = null;
    let settlementChannel: RealtimeChannel | null = null;
    let commentsChannel: RealtimeChannel | null = null;
    let chatChannel: RealtimeChannel | null = null;
    let friendsChannel: RealtimeChannel | null = null;

    try {
      groupChannel = client
        .channel('public:groups')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
          void fetchSupabaseData();
        })
        .subscribe();

      expenseChannel = client
        .channel('public:expenses')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
          void fetchSupabaseData();
        })
        .subscribe();

      settlementChannel = client
        .channel('public:settlements')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () => {
          void fetchSupabaseData();
        })
        .subscribe();

      commentsChannel = client
        .channel('public:comments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
          void fetchSupabaseData();
        })
        .subscribe();

      chatChannel = client
        .channel('public:chat_messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
          void fetchSupabaseData();
        })
        .subscribe();

      friendsChannel = client
        .channel('public:friends')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => {
          void fetchSupabaseData();
        })
        .subscribe();
    } catch {
      return;
    }

    return () => {
      if (groupChannel) client.removeChannel(groupChannel);
      if (expenseChannel) client.removeChannel(expenseChannel);
      if (settlementChannel) client.removeChannel(settlementChannel);
      if (commentsChannel) client.removeChannel(commentsChannel);
      if (chatChannel) client.removeChannel(chatChannel);
      if (friendsChannel) client.removeChannel(friendsChannel);
    };
  }, [isOnline, fetchSupabaseData]);

  const activeGroup = useMemo(() => {
    return groups.find((item) => item.id === activeGroupId) || groups[0];
  }, [groups, activeGroupId]);

  const activeCurrency = useMemo(() => {
    return activeGroup?.defaultCurrency || 'USD';
  }, [activeGroup]);

  useEffect(() => {
    if (activeGroup && typeof activeGroup.simplifyDebts === 'boolean') {
      setSimplifyDebts(activeGroup.simplifyDebts);
    }
  }, [activeGroup]);

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

      const client = getSupabaseClient();
      if (client && isOnline) {
        try {
          const { error: expError } = await client.from('expenses').upsert({
            id: newExpense.id,
            group_id: newExpense.groupId,
            description: newExpense.description,
            amount: newExpense.amount,
            currency_code: newExpense.currencyCode,
            exchange_rate_to_group: newExpense.exchangeRateToGroup,
            category: newExpense.category,
            paid_by_name: newExpense.paidByName,
            split_method: newExpense.splitMethod,
            date: newExpense.date,
            has_receipt: newExpense.hasReceipt,
            created_at: newExpense.createdAt,
          });

          if (!expError) {
            const splitsToInsert = newExpense.splits.map((s) => ({
              id: s.id,
              expense_id: newExpense.id,
              member_name: s.memberName,
              share_amount: s.shareAmount,
              percentage: s.percentage || null,
              shares: s.shares || null,
            }));
            await client.from('expense_splits').upsert(splitsToInsert);
            showToast(`Expense "${expenseData.description}" synced to database`);
            return;
          }
        } catch {
          // fall through to offline queue
        }
      }

      await queueMutation({
        id: `mut-${Date.now()}`,
        type: 'create_expense',
        payload: newExpense as unknown as Record<string, unknown>,
        timestamp: nowIso,
      });
      await refreshPendingCount();
      showToast(`Expense saved locally • Will sync when connected`);
    },
    [
      allExpenses,
      allSettlements,
      groups,
      activities,
      isOnline,
      saveToLocalStorage,
      broadcastLocalEvent,
      refreshPendingCount,
      showToast,
    ]
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

      const client = getSupabaseClient();
      if (client && isOnline) {
        try {
          await client.from('expenses').delete().eq('id', id);
          showToast('Expense removed from database');
          return;
        } catch {
          // fallback to offline queue
        }
      }

      await queueMutation({
        id: `mut-${Date.now()}`,
        type: 'delete_expense',
        payload: { id },
        timestamp: new Date().toISOString(),
      });
      await refreshPendingCount();
      showToast('Expense removed locally • Will sync when connected');
    },
    [
      allExpenses,
      selectedExpenseId,
      allSettlements,
      groups,
      activities,
      isOnline,
      saveToLocalStorage,
      broadcastLocalEvent,
      refreshPendingCount,
      showToast,
    ]
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

      const client = getSupabaseClient();
      if (client && isOnline) {
        try {
          await client.from('settlements').upsert({
            id: newSettlement.id,
            group_id: newSettlement.groupId,
            payer_name: newSettlement.payerName,
            recipient_name: newSettlement.recipientName,
            amount: newSettlement.amount,
            currency_code: newSettlement.currencyCode,
            method: newSettlement.method,
            notes: newSettlement.notes || '',
            created_at: newSettlement.createdAt,
          });
          showToast(`Payment of $${Number(settlementData.amount).toFixed(2)} synced`);
          return;
        } catch {
          // fallback
        }
      }

      await queueMutation({
        id: `mut-${Date.now()}`,
        type: 'record_settlement',
        payload: newSettlement as unknown as Record<string, unknown>,
        timestamp: nowIso,
      });
      await refreshPendingCount();
      showToast(`Payment saved locally • Will sync when connected`);
    },
    [
      allExpenses,
      allSettlements,
      groups,
      activities,
      isOnline,
      saveToLocalStorage,
      broadcastLocalEvent,
      refreshPendingCount,
      showToast,
    ]
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

      const client = getSupabaseClient();
      if (client && isOnline) {
        try {
          await client.from('comments').upsert({
            id: newComment.id,
            expense_id: expenseId,
            author_name: authorName,
            content,
            created_at: newComment.createdAt,
          });
          showToast('Note synced to database');
          return;
        } catch {
          // fallback
        }
      }

      await queueMutation({
        id: `mut-${Date.now()}`,
        type: 'add_comment',
        payload: { expenseId, comment: newComment },
        timestamp: newComment.createdAt,
      });
      await refreshPendingCount();
      showToast('Note saved locally');
    },
    [
      allExpenses,
      allSettlements,
      groups,
      activities,
      isOnline,
      saveToLocalStorage,
      broadcastLocalEvent,
      refreshPendingCount,
      showToast,
    ]
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
        description: 'Shared group ledger',
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

      const client = getSupabaseClient();
      if (client && isOnline) {
        try {
          await client.from('groups').upsert({
            id: newGroup.id,
            name: newGroup.name,
            icon: newGroup.icon,
            category: newGroup.category,
            description: newGroup.description,
            default_currency: newGroup.defaultCurrency,
            simplify_debts: newGroup.simplifyDebts,
            user_role: newGroup.userRole,
            created_at: newGroup.createdAt,
          });

          const membersToInsert = newGroup.members.map((m) => ({
            id: m.id,
            group_id: newGroup.id,
            name: m.name,
            email: m.email,
            avatar_url: m.avatarUrl,
            role: m.role,
            is_current_user: m.isCurrentUser,
          }));
          await client.from('group_members').upsert(membersToInsert);
          showToast(`Group "${name}" synced to database`);
          return;
        } catch {
          // fallback
        }
      }

      await queueMutation({
        id: `mut-${Date.now()}`,
        type: 'create_group',
        payload: newGroup as unknown as Record<string, unknown>,
        timestamp: nowIso,
      });
      await refreshPendingCount();
      showToast(`Group "${name}" saved locally • Will sync when connected`);
    },
    [
      groups,
      allExpenses,
      allSettlements,
      activities,
      isOnline,
      saveToLocalStorage,
      broadcastLocalEvent,
      refreshPendingCount,
      showToast,
    ]
  );

  const updateGroup = useCallback(
    async (groupId: string, updates: Partial<Group>) => {
      const updatedGroups = groups.map((item) => {
        if (item.id === groupId) {
          return { ...item, ...updates };
        }
        return item;
      });

      setGroups(updatedGroups);
      saveToLocalStorage(allExpenses, allSettlements, updatedGroups, activities);
      broadcastLocalEvent('group_updated', { groupId, updates });

      const client = getSupabaseClient();
      if (client && isOnline) {
        try {
          const payload: Record<string, unknown> = {};
          if (updates.name !== undefined) payload.name = updates.name;
          if (updates.category !== undefined) payload.category = updates.category;
          if (updates.defaultCurrency !== undefined) payload.default_currency = updates.defaultCurrency;
          if (updates.simplifyDebts !== undefined) payload.simplify_debts = updates.simplifyDebts;
          if (updates.icon !== undefined) payload.icon = updates.icon;

          await client.from('groups').update(payload).eq('id', groupId);
          showToast('Settings saved to database');
          return;
        } catch {
          // fallback
        }
      }

      await queueMutation({
        id: `mut-${Date.now()}`,
        type: 'update_group',
        payload: { groupId, updates } as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });
      await refreshPendingCount();
      showToast('Settings saved locally');
    },
    [
      groups,
      allExpenses,
      allSettlements,
      activities,
      isOnline,
      saveToLocalStorage,
      broadcastLocalEvent,
      refreshPendingCount,
      showToast,
    ]
  );

  const setActiveCurrency = useCallback(
    (currency: string) => {
      if (activeGroup) {
        void updateGroup(activeGroup.id, { defaultCurrency: currency });
      }
    },
    [activeGroup, updateGroup]
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
    showToast('Payment reminders dispatched to all debtors');
  }, [showToast]);

  const exportGroupCsv = useCallback(() => {
    if (!activeGroup) return;
    const rows = [
      ['Date', 'Description', 'Category', 'Paid By', 'Amount', 'Currency', 'Split Method'],
      ...expenses.map((e) => [
        e.date,
        `"${e.description.replace(/"/g, '""')}"`,
        e.category,
        e.paidByName,
        e.amount.toFixed(2),
        e.currencyCode,
        e.splitMethod,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeGroup.name.toLowerCase().replace(/\s+/g, '_')}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported ledger to CSV');
  }, [activeGroup, expenses, showToast]);

  const updateUserProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const updated = { ...userProfile, ...updates };
      setUserProfile(updated);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(updated));
      }
      void setCachedItem('profiles', updated);

      const client = getSupabaseClient();
      if (client && isOnline) {
        try {
          await client.from('profiles').upsert({
            id: updated.id,
            email: updated.email,
            full_name: updated.fullName,
            username: updated.username,
            avatar_url: updated.avatarUrl,
            default_currency: updated.defaultCurrency,
            phone: updated.phone,
            payment_handle: updated.paymentHandle,
            theme_preference: updated.themePreference,
            google_connected: updated.googleConnected,
            google_email: updated.googleEmail,
            notifications_enabled: updated.notificationsEnabled,
            notify_on_expense: updated.notifyOnExpense,
            notify_on_settlement: updated.notifyOnSettlement,
            notify_on_mention: updated.notifyOnMention,
            notify_weekly_digest: updated.notifyWeeklyDigest,
          });
          return;
        } catch {
          // fallback
        }
      }

      await queueMutation({
        id: `mut-${Date.now()}`,
        type: 'update_profile',
        payload: updated as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });
      await refreshPendingCount();
    },
    [userProfile, isOnline, refreshPendingCount]
  );

  const syncGoogleAccount = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase && isOnline) {
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

    void updateUserProfile({
      googleConnected: true,
      googleEmail: userProfile.email.includes('@') ? userProfile.email : 'you@gmail.com',
    });
    showToast('Google account connected');
    return true;
  }, [updateUserProfile, userProfile.email, isOnline, showToast]);

  const disconnectGoogleAccount = useCallback(() => {
    void updateUserProfile({
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
          showToast('Notification sent');
          return true;
        } catch {
          // fallback
        }
      }
    }

    showToast(`Test notification sent: ${activeGroup.name}`);
    return true;
  }, [activeGroup.name, showToast]);

  const sendChatMessage = useCallback(
    async (data: {
      groupId: string;
      content: string;
      mentions?: string[];
      attachment?: ChatAttachment;
    }) => {
      const nowIso = new Date().toISOString();
      const newMessage: GroupChatMessage = {
        id: `chat-${Date.now()}`,
        groupId: data.groupId,
        senderName: userProfile.fullName || 'You',
        senderAvatarUrl: userProfile.avatarUrl,
        senderIsCurrentUser: true,
        content: data.content,
        mentions: data.mentions || [],
        attachment: data.attachment,
        createdAt: nowIso,
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
        void cacheItems('chat_messages', next);
        return next;
      });

      broadcastLocalEvent('chat_message_added', newMessage);

      const client = getSupabaseClient();
      if (client && isOnline) {
        try {
          await client.from('chat_messages').upsert({
            id: newMessage.id,
            group_id: newMessage.groupId,
            sender_name: newMessage.senderName,
            sender_avatar_url: newMessage.senderAvatarUrl,
            sender_is_current_user: newMessage.senderIsCurrentUser,
            content: newMessage.content,
            mentions: newMessage.mentions,
            attachment: newMessage.attachment || null,
            likes: [],
            created_at: newMessage.createdAt,
          });
          return;
        } catch {
          // fallback
        }
      }

      await queueMutation({
        id: `mut-${Date.now()}`,
        type: 'send_chat_message',
        payload: newMessage as unknown as Record<string, unknown>,
        timestamp: nowIso,
      });
      await refreshPendingCount();
    },
    [userProfile, isOnline, broadcastLocalEvent, refreshPendingCount]
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
        void cacheItems('groups', updated);
        return updated;
      });

      setActiveGroupId(newGroupId);
      showToast(`Created new group ledger: ${name}`);

      const client = getSupabaseClient();
      if (client && isOnline) {
        void client.from('groups').upsert({
          id: newGroup.id,
          name: newGroup.name,
          icon: newGroup.icon,
          category: newGroup.category,
          description: newGroup.description,
          default_currency: newGroup.defaultCurrency,
          simplify_debts: newGroup.simplifyDebts,
          user_role: newGroup.userRole,
          created_at: newGroup.createdAt,
        });
      } else {
        void queueMutation({
          id: `mut-${Date.now()}`,
          type: 'create_group',
          payload: newGroup as unknown as Record<string, unknown>,
          timestamp: nowIso,
        }).then(() => refreshPendingCount());
      }

      return newGroupId;
    },
    [isOnline, refreshPendingCount, showToast]
  );

  const addMembersToGroup = useCallback(
    (groupId: string, newMemberNames: string[]) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      const existingNames = new Set(group.members.map((m) => m.name.toLowerCase()));
      const toAdd = newMemberNames.filter((name) => !existingNames.has(name.toLowerCase()));
      if (toAdd.length === 0) return;

      const newMembers: GroupMember[] = toAdd.map((name, index) => ({
        id: `member-${groupId}-${Date.now()}-${index}`,
        groupId,
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '')}@splitest.app`,
        avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + ((index + 1) * 3137) % 10000}?auto=format&fit=crop&w=160&q=80`,
        role: 'editor',
        isCurrentUser: false,
      }));

      const updatedGroups = groups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            members: [...g.members, ...newMembers],
          };
        }
        return g;
      });

      setGroups(updatedGroups);
      saveToLocalStorage(allExpenses, allSettlements, updatedGroups, activities);
      broadcastLocalEvent('group_updated', { groupId });
      showToast(`Added ${toAdd.join(', ')} to ${group.name}`);

      void sendChatMessage({
        groupId,
        content: `Added ${toAdd.join(', ')} to the chat`,
      });

      const client = getSupabaseClient();
      if (client && isOnline) {
        const payload = newMembers.map((m) => ({
          id: m.id,
          group_id: m.groupId,
          name: m.name,
          email: m.email,
          avatar_url: m.avatarUrl,
          role: m.role,
          is_current_user: m.isCurrentUser,
        }));
        void client.from('group_members').upsert(payload);
      }
    },
    [
      groups,
      allExpenses,
      allSettlements,
      activities,
      isOnline,
      saveToLocalStorage,
      broadcastLocalEvent,
      showToast,
      sendChatMessage,
    ]
  );

  const toggleChatMessageLike = useCallback(
    async (messageId: string) => {
      const currentUserName = userProfile.fullName || 'You';
      let nextLikes: string[] = [];

      setAllChatMessages((prev) => {
        const next = prev.map((msg) => {
          if (msg.id === messageId) {
            const currentLikes = msg.likes || [];
            const hasLiked = currentLikes.includes(currentUserName);
            nextLikes = hasLiked
              ? currentLikes.filter((u) => u !== currentUserName)
              : [...currentLikes, currentUserName];
            return {
              ...msg,
              likes: nextLikes,
            };
          }
          return msg;
        });

        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        void cacheItems('chat_messages', next);
        return next;
      });

      const client = getSupabaseClient();
      if (client && isOnline) {
        try {
          await client.from('chat_messages').update({ likes: nextLikes }).eq('id', messageId);
          return;
        } catch {
          // fallback
        }
      }

      await queueMutation({
        id: `mut-${Date.now()}`,
        type: 'toggle_chat_like',
        payload: { messageId, likes: nextLikes },
        timestamp: new Date().toISOString(),
      });
      await refreshPendingCount();
    },
    [userProfile.fullName, isOnline, refreshPendingCount]
  );

  const applyThemeToDocument = useCallback((mode: ThemeMode) => {
    if (typeof window === 'undefined') return;
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body?.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body?.classList.remove('dark');
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
      void updateUserProfile({ themePreference: newTheme });
      showToast(`Theme set to ${newTheme}`);
    },
    [applyThemeToDocument, updateUserProfile, showToast]
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

  const allFriendsList = useMemo<FriendContact[]>(() => {
    const friendMap = new Map<string, FriendContact>();

    PRESET_USERS_DIRECTORY.forEach((preset) => {
      friendMap.set(preset.username.toLowerCase(), preset);
    });

    groups.forEach((group) => {
      group.members.forEach((member) => {
        if (!member.isCurrentUser) {
          const generatedUsername = member.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
          const existing = friendMap.get(generatedUsername);
          if (existing) {
            friendMap.set(generatedUsername, {
              ...existing,
              groupCount: (existing.groupCount || 0) + 1,
            });
          } else {
            friendMap.set(generatedUsername, {
              id: member.id,
              name: member.name,
              username: generatedUsername,
              avatarUrl: member.avatarUrl,
              email: member.email || `${generatedUsername}@example.com`,
              groupCount: 1,
            });
          }
        }
      });
    });

    customFriends.forEach((friend) => {
      friendMap.set(friend.username.toLowerCase(), friend);
    });

    return Array.from(friendMap.values());
  }, [groups, customFriends]);

  const addFriendDirectly = useCallback(
    async (friend: FriendContact) => {
      setCustomFriends((prev) => {
        const exists = prev.some((item) => item.username.toLowerCase() === friend.username.toLowerCase());
        if (exists) return prev;
        const updated = [friend, ...prev];
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_FRIENDS_KEY, JSON.stringify(updated));
        }
        void cacheItems('friends', updated);
        return updated;
      });

      const client = getSupabaseClient();
      if (client && isOnline) {
        try {
          await client.from('friends').upsert({
            id: friend.id,
            name: friend.name,
            username: friend.username,
            email: friend.email,
            avatar_url: friend.avatarUrl,
            phone: '',
            added_via: friend.addedVia || 'directory',
          });
          showToast(`Added @${friend.username} as friend`);
          return;
        } catch {
          // fallback
        }
      }

      await queueMutation({
        id: `mut-${Date.now()}`,
        type: 'add_friend',
        payload: friend as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });
      await refreshPendingCount();
      showToast(`Added @${friend.username} locally`);
    },
    [isOnline, refreshPendingCount, showToast]
  );

  const addFriendByUsername = useCallback(
    (query: string) => {
      const match = findUserByUsername(query);
      if (!match) {
        return {
          success: false,
          message: 'No user found with that username or profile link.',
        };
      }
      const currentUsername = userProfile.username || 'you.splitest';
      if (match.username.toLowerCase() === currentUsername.toLowerCase()) {
        return {
          success: false,
          message: 'You cannot add yourself as a friend.',
        };
      }
      const alreadyExists = allFriendsList.some(
        (item) => item.username.toLowerCase() === match.username.toLowerCase()
      );
      if (alreadyExists) {
        return {
          success: true,
          friend: match,
          message: `@${match.username} is already in your friends list.`,
        };
      }
      void addFriendDirectly(match);
      return {
        success: true,
        friend: match,
        message: `Successfully added @${match.username} to your friends!`,
      };
    },
    [userProfile.username, allFriendsList, addFriendDirectly]
  );

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
      pendingSyncCount,
      isOffline: !isOnline,
      syncNow,
      isConfigModalOpen,
      setIsConfigModalOpen,
      isAddExpenseModalOpen,
      setIsAddExpenseModalOpen,
      isSettleModalOpen,
      setIsSettleModalOpen,
      isShareModalOpen,
      setIsShareModalOpen,
      isLedgerSettingsModalOpen,
      setIsLedgerSettingsModalOpen,
      isShareProfileModalOpen,
      setIsShareProfileModalOpen,
      isAddFriendModalOpen,
      setIsAddFriendModalOpen,
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
      allFriendsList,
      addFriendDirectly,
      addFriendByUsername,
      addExpense,
      deleteExpense,
      addSettlement,
      addComment,
      createGroup,
      updateGroup,
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
      addMembersToGroup,
      toggleChatMessageLike,
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
      pendingSyncCount,
      isOnline,
      syncNow,
      isConfigModalOpen,
      isAddExpenseModalOpen,
      isSettleModalOpen,
      isShareModalOpen,
      isLedgerSettingsModalOpen,
      isShareProfileModalOpen,
      isAddFriendModalOpen,
      activeCurrency,
      setActiveCurrency,
      segment,
      settlePrefill,
      isNewGroupModalOpen,
      toastMessage,
      showToast,
      allFriendsList,
      addFriendDirectly,
      addFriendByUsername,
      addExpense,
      deleteExpense,
      addSettlement,
      addComment,
      createGroup,
      updateGroup,
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
      addMembersToGroup,
      toggleChatMessageLike,
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
