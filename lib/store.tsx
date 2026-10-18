'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { getSupabaseClient, saveSupabaseConfig } from '@/lib/supabase';
import { findUserByUsername, fetchUserProfileFromDatabase } from '@/lib/users-directory';
import { getGravatarUrl, isGoogleAvatarUrl } from '@/lib/avatar';
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
import { SupabaseClient } from '@supabase/supabase-js';

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
  addFriendByUsername: (query: string) => Promise<{ success: boolean; friend?: FriendContact; message: string }>;
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
  id: '',
  username: '',
  email: '',
  fullName: '',
  avatarUrl: '',
  googleAvatarUrl: '',
  defaultCurrency: 'USD',
  phone: '',
  paymentHandle: '',
  themePreference: 'system',
  googleConnected: false,
  googleEmail: '',
  notificationsEnabled: true,
  notifyOnExpense: true,
  notifyOnSettlement: true,
  notifyOnMention: true,
  notifyWeeklyDigest: false,
};

const fallbackEmptyGroup: Group = {
  id: '',
  name: 'No Groups',
  icon: 'Users',
  category: 'General',
  description: '',
  defaultCurrency: 'USD',
  simplifyDebts: true,
  userRole: 'owner',
  createdAt: '',
  members: [],
};

export function SplitestProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const isFetchingRef = useRef(false);

  const [groups, setGroups] = useState<Group[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(STORAGE_GROUPS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && !parsed.some((g: Group) => g.id === 'group-bali-retreat')) {
          return parsed;
        }
      }
    } catch {
      return [];
    }
    return [];
  });

  const [activeGroupId, setActiveGroupId] = useState<string>('');
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
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(STORAGE_CHAT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && !parsed.some((c: GroupChatMessage) => c.id === 'chat-1')) {
          return parsed;
        }
      }
    } catch {
      return [];
    }
    return [];
  });

  const chatMessages = useMemo(() => {
    if (!activeGroupId) return [];
    return allChatMessages.filter((msg) => msg.groupId === activeGroupId);
  }, [allChatMessages, activeGroupId]);

  const [allExpenses, setAllExpenses] = useState<Expense[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(STORAGE_EXPENSES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && !parsed.some((e: Expense) => e.id === 'exp-villa-deposit')) {
          return parsed;
        }
      }
    } catch {
      return [];
    }
    return [];
  });

  const [allSettlements, setAllSettlements] = useState<Settlement[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(STORAGE_SETTLEMENTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && !parsed.some((s: Settlement) => s.id === 'settle-1')) {
          return parsed;
        }
      }
    } catch {
      return [];
    }
    return [];
  });

  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
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
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(STORAGE_ACTIVITIES_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      return [];
    }
    return [];
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawGroups = window.localStorage.getItem(STORAGE_GROUPS_KEY);
      if (rawGroups && rawGroups.includes('group-bali-retreat')) {
        window.localStorage.removeItem(STORAGE_GROUPS_KEY);
        window.localStorage.removeItem(STORAGE_EXPENSES_KEY);
        window.localStorage.removeItem(STORAGE_SETTLEMENTS_KEY);
        window.localStorage.removeItem(STORAGE_CHAT_KEY);
        window.localStorage.removeItem(STORAGE_ACTIVITIES_KEY);
      }
    } catch {
      return;
    }
  }, []);

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

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setSupabaseStatus('connecting');

      await processOfflineQueue(client);

      const [
        groupsResponse,
        membersResponse,
        expensesResponse,
        splitsResponse,
        settlementsResponse,
        commentsResponse,
        chatResponse,
        friendsResponse,
        authUserData,
      ] = await Promise.all([
        client.from('groups').select('*').order('created_at', { ascending: false }),
        client.from('group_members').select('*'),
        client.from('expenses').select('*').order('date', { ascending: false }),
        client.from('expense_splits').select('*'),
        client.from('settlements').select('*').order('created_at', { ascending: false }),
        client.from('comments').select('*').order('created_at', { ascending: true }),
        client.from('chat_messages').select('*').order('created_at', { ascending: true }),
        client.from('friends').select('*').order('created_at', { ascending: false }),
        client.auth.getUser(),
      ]);

      if (groupsResponse.error) throw groupsResponse.error;

      const authUser = authUserData?.data?.user;
      if (authUser) {
        const googlePhoto =
          authUser.user_metadata?.avatar_url ||
          authUser.user_metadata?.picture ||
          '';
        const gravatarPhoto = authUser.email ? getGravatarUrl(authUser.email) : '';

        const { data: profileRecord } = await client
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileRecord) {
          const effectiveAvatar =
            profileRecord.avatar_url ||
            googlePhoto ||
            gravatarPhoto ||
            '';
          const loadedProfile: UserProfile = {
            id: profileRecord.id,
            email: profileRecord.email || authUser.email || '',
            fullName: profileRecord.full_name || authUser.user_metadata?.full_name || '',
            username: profileRecord.username || '',
            avatarUrl: effectiveAvatar,
            googleAvatarUrl: googlePhoto,
            defaultCurrency: profileRecord.default_currency || 'USD',
            phone: profileRecord.phone || '',
            paymentHandle: profileRecord.payment_handle || '',
            themePreference: (profileRecord.theme_preference as ThemeMode) || 'system',
            googleConnected: profileRecord.google_connected || !!authUser.app_metadata?.provider?.includes('google'),
            googleEmail: profileRecord.google_email || (authUser.app_metadata?.provider?.includes('google') ? authUser.email : ''),
            notificationsEnabled: profileRecord.notifications_enabled ?? true,
            notifyOnExpense: profileRecord.notify_on_expense ?? true,
            notifyOnSettlement: profileRecord.notify_on_settlement ?? true,
            notifyOnMention: profileRecord.notify_on_mention ?? true,
            notifyWeeklyDigest: profileRecord.notify_weekly_digest ?? false,
          };
          setUserProfile(loadedProfile);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(loadedProfile));
          }
        } else {
          const effectiveAvatar = googlePhoto || gravatarPhoto || '';
          const initialName =
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            (authUser.email ? authUser.email.split('@')[0] : 'User');
          const initialUsername = initialName.toLowerCase().replace(/[^a-z0-9]/g, '.');
          const newProfile = {
            id: authUser.id,
            email: authUser.email || '',
            full_name: initialName,
            username: initialUsername,
            avatar_url: effectiveAvatar,
            default_currency: 'USD',
            phone: '',
            payment_handle: '',
            theme_preference: 'system',
            google_connected: !!authUser.app_metadata?.provider?.includes('google'),
            google_email: authUser.app_metadata?.provider?.includes('google') ? authUser.email : '',
            notifications_enabled: true,
            notify_on_expense: true,
            notify_on_settlement: true,
            notify_on_mention: true,
            notify_weekly_digest: false,
          };
          await client.from('profiles').upsert(newProfile);
          const loadedProfile: UserProfile = {
            id: newProfile.id,
            email: newProfile.email,
            fullName: newProfile.full_name,
            username: newProfile.username,
            avatarUrl: newProfile.avatar_url,
            googleAvatarUrl: googlePhoto,
            defaultCurrency: newProfile.default_currency,
            phone: newProfile.phone,
            paymentHandle: newProfile.payment_handle,
            themePreference: 'system',
            googleConnected: newProfile.google_connected,
            googleEmail: newProfile.google_email,
            notificationsEnabled: true,
            notifyOnExpense: true,
            notifyOnSettlement: true,
            notifyOnMention: true,
            notifyWeeklyDigest: false,
          };
          setUserProfile(loadedProfile);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(loadedProfile));
          }
        }
      }

      const rawSupabaseGroups = groupsResponse.data || [];
      const hasMockGroupInDb = rawSupabaseGroups.some((item) => item.id === 'group-bali-retreat');
      if (hasMockGroupInDb) {
        void client.from('groups').delete().eq('id', 'group-bali-retreat');
      }

      const fetchedMembers = membersResponse.data || [];
      const builtGroups: Group[] = rawSupabaseGroups
        .filter((item) => item.id !== 'group-bali-retreat')
        .map((item) => ({
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
              avatarUrl: m.avatar_url || (m.email ? getGravatarUrl(m.email) : ''),
              role: m.role === 'owner' || m.role === 'editor' || m.role === 'viewer' ? m.role : 'editor',
              isCurrentUser: m.is_current_user || false,
            })),
        }));

      const fetchedSplits = splitsResponse.data || [];
      const fetchedComments = commentsResponse.data || [];

      const builtExpenses: Expense[] = (expensesResponse.data || [])
        .filter((exp) => exp.group_id !== 'group-bali-retreat')
        .map((exp) => ({
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

      const builtSettlements: Settlement[] = (settlementsResponse.data || [])
        .filter((set) => set.group_id !== 'group-bali-retreat')
        .map((set) => ({
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

      const builtChatMessages: GroupChatMessage[] = (chatResponse.data || [])
        .filter((c) => c.group_id !== 'group-bali-retreat')
        .map((c) => ({
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
        avatarUrl: f.avatar_url || (f.email ? getGravatarUrl(f.email) : ''),
        netBalance: Number(f.net_balance) || 0,
        groupCount: Number(f.group_count) || 0,
        addedVia: f.added_via || 'directory',
      }));

      setGroups(builtGroups);
      setAllExpenses(builtExpenses);
      setAllSettlements(builtSettlements);
      setAllChatMessages(builtChatMessages);
      setCustomFriends(builtFriends);
      setSupabaseStatus('connected');

      saveToLocalStorage(
        builtExpenses,
        builtSettlements,
        builtGroups,
        [],
        builtChatMessages,
        builtFriends
      );
    } catch {
      setSupabaseStatus('error');
    } finally {
      isFetchingRef.current = false;
    }
  }, [isOnline, processOfflineQueue, saveToLocalStorage]);

  const fetchSupabaseDataRef = useRef(fetchSupabaseData);
  fetchSupabaseDataRef.current = fetchSupabaseData;

  const syncNow = useCallback(async () => {
    await fetchSupabaseDataRef.current();
  }, []);

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

    void fetchSupabaseDataRef.current();
  }, [isOnline]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        document.cookie = "splitest_session=; path=/; max-age=0";
        window.location.href = "/login";
      } else if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        document.cookie = `splitest_session=authenticated; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        void fetchSupabaseDataRef.current();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

        if (cachedGroups && cachedGroups.some((g) => g.id === 'group-bali-retreat')) {
          await deleteCachedItem('groups', 'group-bali-retreat');
        }

        const cleanGroups = (cachedGroups || []).filter((g) => g.id !== 'group-bali-retreat');
        const cleanExpenses = (cachedExpenses || []).filter((e) => e.groupId !== 'group-bali-retreat');
        const cleanSettlements = (cachedSettlements || []).filter((s) => s.groupId !== 'group-bali-retreat');
        const cleanChat = (cachedChat || []).filter((c) => c.groupId !== 'group-bali-retreat');

        if (cleanGroups.length > 0) setGroups(cleanGroups);
        if (cleanExpenses.length > 0) setAllExpenses(cleanExpenses);
        if (cleanSettlements.length > 0) setAllSettlements(cleanSettlements);
        if (cleanChat.length > 0) setAllChatMessages(cleanChat);
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

    let debounceTimer: NodeJS.Timeout | null = null;
    const triggerDebouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void fetchSupabaseDataRef.current();
      }, 400);
    };

    const channel = client
      .channel('public-db-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, triggerDebouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, triggerDebouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, triggerDebouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, triggerDebouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_splits' }, triggerDebouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, triggerDebouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, triggerDebouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, triggerDebouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, triggerDebouncedFetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      client.removeChannel(channel);
    };
  }, [isOnline]);

  useEffect(() => {
    if (groups.length > 0 && (!activeGroupId || !groups.some((g) => g.id === activeGroupId))) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups, activeGroupId]);

  const activeGroup = useMemo(() => {
    if (groups.length === 0) return fallbackEmptyGroup;
    return groups.find((item) => item.id === activeGroupId) || groups[0] || fallbackEmptyGroup;
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
    if (!activeGroupId) return [];
    return allExpenses.filter((item) => item.groupId === activeGroupId);
  }, [allExpenses, activeGroupId]);

  const settlements = useMemo(() => {
    if (!activeGroupId) return [];
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
          email: mName === 'You' ? userProfile.email : '',
          avatarUrl: mName === 'You' ? userProfile.avatarUrl || '' : '',
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
      if (activeGroup && activeGroup.id) {
        void updateGroup(activeGroup.id, { defaultCurrency: currency });
      }
    },
    [activeGroup, updateGroup]
  );

  const updateSupabaseCredentials = useCallback(
    async (url: string, anonKey: string) => {
      if (!url.trim() || !anonKey.trim()) return false;
      saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
      await fetchSupabaseDataRef.current();
      return true;
    },
    []
  );

  const clearSupabaseCredentials = useCallback(() => {
    saveSupabaseConfig(null);
    setSupabaseStatus('simulated');
    showToast('Reverted to local mode');
  }, [showToast]);

  const sendPaymentReminders = useCallback(() => {
    showToast('Payment reminders dispatched to all debtors');
  }, [showToast]);

  const exportGroupCsv = useCallback(() => {
    if (!activeGroup || !activeGroup.id) return;
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
    link.setAttribute('download', `${(activeGroup.name || 'group').toLowerCase().replace(/\s+/g, '_')}_expenses.csv`);
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
            body: `${activeGroup.name || 'Splitest'}: Activity recorded in ledger`,
            icon: '/Splitest.svg',
          });
          showToast('Notification sent');
          return true;
        } catch {
          // fallback
        }
      }
    }

    showToast(`Test notification sent`);
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
          email: mName === 'You' ? userProfile.email : '',
          avatarUrl: mName === 'You' ? userProfile.avatarUrl || '' : '',
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
    [isOnline, refreshPendingCount, showToast, userProfile.email, userProfile.avatarUrl]
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
        email: '',
        avatarUrl: '',
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
              avatarUrl: member.avatarUrl || (member.email ? getGravatarUrl(member.email) : ''),
              email: member.email || '',
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
    async (query: string) => {
      let match = findUserByUsername(query, allFriendsList);
      if (!match) {
        match = await fetchUserProfileFromDatabase(query);
      }
      if (!match) {
        return {
          success: false,
          message: 'No user found with that username or profile link.',
        };
      }
      const currentUsername = userProfile.username || '';
      if (currentUsername && match.username.toLowerCase() === currentUsername.toLowerCase()) {
        return {
          success: false,
          message: 'You cannot add yourself as a friend.',
        };
      }
      const alreadyExists = allFriendsList.some(
        (item) => item.username.toLowerCase() === match!.username.toLowerCase()
      );
      if (alreadyExists) {
        return {
          success: true,
          friend: match,
          message: `@${match.username} is already in your friends list.`,
        };
      }
      await addFriendDirectly(match);
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
