export interface FriendContact {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string;
  phone?: string;
  netBalance?: number;
  groupCount?: number;
  addedVia?: 'link' | 'username' | 'group' | 'search' | 'directory';
}

export interface GroupMember {
  id: string;
  groupId: string;
  email: string;
  name: string;
  username?: string;
  phone?: string;
  avatarUrl: string;
  role: 'owner' | 'editor' | 'viewer';
  isCurrentUser: boolean;
  userId?: string;
}

export interface Group {
  id: string;
  name: string;
  icon: string;
  category: string;
  description?: string;
  defaultCurrency: string;
  simplifyDebts: boolean;
  userRole: 'owner' | 'editor' | 'viewer';
  createdAt: string;
  members: GroupMember[];
  isDirectChat?: boolean;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  memberEmail: string;
  memberName: string;
  shareAmount: number;
  percentage?: number;
  shares?: number;
}

export interface ExpenseComment {
  id: string;
  expenseId: string;
  authorEmail: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currencyCode: string;
  exchangeRateToGroup: number;
  category: 'villa' | 'dining' | 'transport' | 'activities' | 'groceries' | 'general';
  paidByEmail: string;
  paidByName: string;
  splitMethod: 'equal' | 'exact' | 'percentage' | 'shares';
  date: string;
  hasReceipt: boolean;
  splits: ExpenseSplit[];
  comments: ExpenseComment[];
  createdAt: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  payerEmail: string;
  recipientEmail: string;
  payerName: string;
  recipientName: string;
  amount: number;
  currencyCode: string;
  method: string;
  notes?: string;
  createdAt: string;
}

export interface SimplifiedDebt {
  debtor: string;
  creditor: string;
  amount: number;
  currencyCode?: string;
}

export interface MemberBalanceSummary {
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export interface CategoryBreakdownItem {
  category: string;
  total: number;
  percentage: number;
  color: string;
}

export interface ActivityFeedItem {
  id: string;
  type: 'expense_created' | 'expense_updated' | 'settlement_recorded' | 'comment_added';
  title: string;
  subtitle: string;
  timestamp: string;
  iconName: string;
  iconColorClass: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  username?: string;
  avatarUrl: string;
  googleAvatarUrl?: string;
  defaultCurrency: string;
  phone?: string;
  paymentHandle?: string;
  themePreference: ThemeMode;
  googleConnected: boolean;
  googleEmail?: string;
  notificationsEnabled: boolean;
  notifyOnExpense: boolean;
  notifyOnSettlement: boolean;
  notifyOnMention: boolean;
  notifyWeeklyDigest: boolean;
}

export interface ChatAttachment {
  type: 'expense' | 'settlement' | 'borrow_request' | 'receipt';
  referenceId?: string;
  title: string;
  amount: number;
  currencyCode: string;
  payerName?: string;
  recipientName?: string;
}

export interface GroupChatMessage {
  id: string;
  groupId: string;
  senderEmail: string;
  senderName: string;
  senderAvatarUrl: string;
  senderIsCurrentUser: boolean;
  content: string;
  mentions: string[];
  attachment?: ChatAttachment;
  likes?: string[];
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  type: 'expense' | 'settlement' | 'comment' | 'chat' | 'invite' | 'system';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  groupId?: string;
  expenseId?: string;
  actorEmail?: string;
  actorName?: string;
}
