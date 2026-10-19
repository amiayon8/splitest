"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSplitest } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import { LocalTime } from "@/lib/timezone";
import { getCurrentUserMemberName } from "@/lib/split-calculator";
import { ChatAttachment } from "@/types";
import {
  Send,
  AtSign,
  Users,
  Handshake,
  Receipt,
  ArrowRight,
  CheckCheck,
  X,
  Plus,
  Heart,
  SquarePen,
  Search,
  UserPlus,
  SlidersHorizontal,
  ChevronLeft,
  Check,
  Tag,
  DollarSign,
  Info,
} from "lucide-react";



export function GroupChatView() {
  const {
    groups,
    activeGroupId,
    setActiveGroupId,
    activeGroup,
    chatMessages,
    allChatMessages,
    sendChatMessage,
    createGroupFromChat,
    addMembersToGroup,
    toggleChatMessageLike,
    expenses,
    setSelectedExpenseId,
    setCurrentView,
    setIsSettleModalOpen,
    setSettlePrefill,
    setIsLedgerSettingsModalOpen,
    activeCurrency,
    userProfile,
    allFriendsList,
    setIsAddFriendModalOpen,
  } = useSplitest();

  const [messageInput, setMessageInput] = useState("");
  const [activeAttachment, setActiveAttachment] =
    useState<ChatAttachment | null>(null);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachTab, setAttachTab] = useState<"expense" | "borrow">("expense");

  const [searchFriendsModalMode, setSearchFriendsModalMode] = useState<
    "new_chat" | "add_to_group" | null
  >(null);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [selectedFriendNames, setSelectedFriendNames] = useState<string[]>([]);
  const [newChatGroupName, setNewChatGroupName] = useState("");
  const [newChatCategory, setNewChatCategory] = useState("Trip");

  const [inboxSearchQuery, setInboxSearchQuery] = useState("");
  const [isMobileInboxView, setIsMobileInboxView] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  const currentMemberName = getCurrentUserMemberName(activeGroup, userProfile);
  const isSelf = (name: string) =>
    name === currentMemberName ||
    name === "You" ||
    (Boolean(userProfile?.fullName) && name === userProfile.fullName) ||
    (Boolean(userProfile?.username) && name === userProfile.username);

  const [customExpenseTitle, setCustomExpenseTitle] = useState("");
  const [customExpenseAmount, setCustomExpenseAmount] = useState("");
  const [customExpensePayer, setCustomExpensePayer] = useState("");

  useEffect(() => {
    if (currentMemberName) {
      setCustomExpensePayer(currentMemberName);
    }
  }, [currentMemberName]);

  const [borrowTargetMember, setBorrowTargetMember] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [borrowPurpose, setBorrowPurpose] = useState("");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  const [isMentionDropdownOpen, setIsMentionDropdownOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0);

  const groupMembers = useMemo(() => {
    return activeGroup?.members || [];
  }, [activeGroup]);

  const activeGroupMemberNamesSet = useMemo(() => {
    return new Set(groupMembers.map((m) => m.name.toLowerCase()));
  }, [groupMembers]);

  const allAvailableFriends = useMemo(() => {
    const map = new Map<
      string,
      { name: string; username?: string; email: string; avatarUrl: string }
    >();

    for (const group of groups) {
      for (const member of group.members) {
        if (!isSelf(member.name) && !map.has(member.name)) {
          const generatedUsername = member.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
          map.set(member.name, {
            name: member.name,
            username: generatedUsername,
            email: member.email || "",
            avatarUrl: member.avatarUrl || "",
          });
        }
      }
    }

    allFriendsList.forEach((friend) => {
      const existing = map.get(friend.name);
      if (existing) {
        existing.username = friend.username;
        if (friend.avatarUrl) existing.avatarUrl = friend.avatarUrl;
      } else {
        map.set(friend.name, {
          name: friend.name,
          username: friend.username,
          email: friend.email || "",
          avatarUrl: friend.avatarUrl || "",
        });
      }
    });

    return Array.from(map.values());
  }, [groups, allFriendsList]);

  const filteredFriendsList = useMemo(() => {
    const query = friendSearchQuery.trim().toLowerCase().replace(/^[#@]+/, '');
    if (!query) return allAvailableFriends;
    return allAvailableFriends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) ||
        (friend.username && friend.username.toLowerCase().includes(query)) ||
        friend.email.toLowerCase().includes(query),
    );
  }, [allAvailableFriends, friendSearchQuery]);

  const filteredGroupsList = useMemo(() => {
    const query = inboxSearchQuery.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.members.some((m) => m.name.toLowerCase().includes(query)),
    );
  }, [groups, inboxSearchQuery]);

  const groupLastMessageMap = useMemo(() => {
    const map: Record<string, { snippet: string; timestamp: string }> = {};
    for (const g of groups) {
      const msgs = allChatMessages.filter((m) => m.groupId === g.id);
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        const snippet = last.attachment
          ? `${last.senderName}: Shared ${last.attachment.title}`
          : `${last.senderName}: ${last.content}`;
        map[g.id] = { snippet, timestamp: last.createdAt };
      } else {
        map[g.id] = { snippet: "Start the conversation", timestamp: g.createdAt };
      }
    }
    return map;
  }, [groups, allChatMessages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, activeGroupId]);

  const handleOpenNewChatModal = () => {
    setSelectedFriendNames([]);
    setFriendSearchQuery("");
    setNewChatGroupName("");
    setNewChatCategory("Trip");
    setSearchFriendsModalMode("new_chat");
    setTimeout(() => searchInputRef.current?.focus(), 80);
  };

  const handleOpenAddFriendsModal = () => {
    setSelectedFriendNames([]);
    setFriendSearchQuery("");
    setSearchFriendsModalMode("add_to_group");
    setTimeout(() => searchInputRef.current?.focus(), 80);
  };

  const handleToggleSelectFriend = (friendName: string) => {
    setSelectedFriendNames((prev) => {
      if (prev.includes(friendName)) {
        return prev.filter((name) => name !== friendName);
      }
      return [...prev, friendName];
    });
    setFriendSearchQuery("");
    searchInputRef.current?.focus();
  };

  const handleRemoveFriendChip = (friendName: string) => {
    setSelectedFriendNames((prev) =>
      prev.filter((name) => name !== friendName),
    );
  };

  const handleConfirmFriendsModal = () => {
    if (selectedFriendNames.length === 0) return;

    if (searchFriendsModalMode === "new_chat") {
      const generatedName =
        newChatGroupName.trim() ||
        (selectedFriendNames.length === 1
          ? `${selectedFriendNames[0]} & You`
          : `${selectedFriendNames.slice(0, 2).join(", ")} & You`);

      const createdId = createGroupFromChat(
        generatedName,
        newChatCategory,
        selectedFriendNames,
      );
      setActiveGroupId(createdId);
      setIsMobileInboxView(false);
    } else if (searchFriendsModalMode === "add_to_group" && activeGroup) {
      addMembersToGroup(activeGroup.id, selectedFriendNames);
    }

    setSearchFriendsModalMode(null);
    setSelectedFriendNames([]);
    setFriendSearchQuery("");
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setIsMentionDropdownOpen(false);
      }
    };
    if (isMentionDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [isMentionDropdownOpen]);

  const mentionCandidates = useMemo(() => {
    const groupMemberNamesSet = new Set(
      groupMembers.map((m) => m.name.toLowerCase())
    );

    const list: Array<{
      id: string;
      name: string;
      handle: string;
      avatarUrl?: string;
      isAll?: boolean;
      subtitle?: string;
    }> = [
      {
        id: "all",
        name: "All members",
        handle: "all",
        isAll: true,
        subtitle: `Mention all ${groupMembers.length} members in this group`,
      },
      ...groupMembers.map((m) => ({
        id: m.id,
        name: m.name,
        handle: m.name.toLowerCase().replace(/[^a-z0-9]/g, "."),
        avatarUrl: m.avatarUrl,
        subtitle: isSelf(m.name) ? `${m.role || "Member"} (You)` : m.role || "Member",
      })),
    ];

    allFriendsList.forEach((friend) => {
      if (!groupMemberNamesSet.has(friend.name.toLowerCase())) {
        list.push({
          id: friend.id,
          name: friend.name,
          handle: friend.username || friend.name.toLowerCase().replace(/[^a-z0-9]/g, "."),
          avatarUrl: friend.avatarUrl,
          subtitle: "Friend",
        });
      }
    });

    const q = mentionQuery.toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.handle.toLowerCase().includes(q)
    );
  }, [groupMembers, allFriendsList, mentionQuery]);

  const handleSelectMention = (item: {
    id?: string;
    handle: string;
    name: string;
    avatarUrl?: string;
    isAll?: boolean;
    subtitle?: string;
  }) => {
    const textarea = textareaRef.current;
    const mentionTag = item.isAll ? "@all " : `@${item.handle} `;

    if (textarea && mentionStartIndex >= 0) {
      const cursor = textarea.selectionStart ?? messageInput.length;
      const beforeMention = messageInput.slice(0, mentionStartIndex);
      const afterCursor = messageInput.slice(cursor);
      const newValue = `${beforeMention}${mentionTag}${afterCursor}`;
      setMessageInput(newValue);
      setIsMentionDropdownOpen(false);

      setTimeout(() => {
        textarea.focus();
        const newCursorPos = beforeMention.length + mentionTag.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 10);
    } else {
      setMessageInput(
        (prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${mentionTag}`
      );
      setIsMentionDropdownOpen(false);
      textareaRef.current?.focus();
    }
  };

  const handleInsertMention = (memberName: string) => {
    const handle = memberName.toLowerCase().replace(/[^a-z0-9]/g, ".");
    handleSelectMention({ handle, name: memberName });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    const cursorPos = e.target.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setMentionStartIndex(textBeforeCursor.lastIndexOf("@"));
      setIsMentionDropdownOpen(true);
      setHighlightedMentionIndex(0);
    } else {
      setIsMentionDropdownOpen(false);
    }
  };

  const handleInputSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const cursorPos = target.selectionStart ?? target.value.length;
    const textBeforeCursor = target.value.slice(0, cursorPos);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setMentionStartIndex(textBeforeCursor.lastIndexOf("@"));
      setIsMentionDropdownOpen(true);
    } else {
      setIsMentionDropdownOpen(false);
    }
  };

  const handleAttachExistingExpense = (expenseId: string) => {
    const target = expenses.find((e) => e.id === expenseId);
    if (!target) return;
    setActiveAttachment({
      type: "expense",
      referenceId: target.id,
      title: target.description,
      amount: target.amount,
      currencyCode: target.currencyCode,
      payerName: target.paidByName,
    });
    setIsAttachModalOpen(false);
    textareaRef.current?.focus();
  };

  const handleAttachCustomExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(customExpenseAmount);
    if (!customExpenseTitle.trim() || isNaN(amountNum) || amountNum <= 0)
      return;
    setActiveAttachment({
      type: "expense",
      title: customExpenseTitle.trim(),
      amount: amountNum,
      currencyCode: activeCurrency,
      payerName: customExpensePayer,
    });
    setCustomExpenseTitle("");
    setCustomExpenseAmount("");
    setIsAttachModalOpen(false);
    textareaRef.current?.focus();
  };

  const handleAttachBorrowRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(borrowAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;
    const recipient =
      borrowTargetMember ||
      groupMembers.find((m) => !isSelf(m.name))?.name ||
      "Group";
    setActiveAttachment({
      type: "borrow_request",
      title: borrowPurpose.trim() || "Borrow Request",
      amount: amountNum,
      currencyCode: activeCurrency,
      recipientName: recipient,
      payerName: currentMemberName,
    });
    setBorrowAmount("");
    setBorrowPurpose("");
    setIsAttachModalOpen(false);
    textareaRef.current?.focus();
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = messageInput.trim();
    if (!content && !activeAttachment) return;

    const detectedMentions: string[] = [];
    if (
      content.toLowerCase().includes("@all") ||
      content.toLowerCase().includes("@everyone")
    ) {
      detectedMentions.push("All");
    }
    groupMembers.forEach((member) => {
      const handle = member.name.toLowerCase().replace(/[^a-z0-9]/g, ".");
      if (
        content.toLowerCase().includes(`@${member.name.toLowerCase()}`) ||
        content.toLowerCase().includes(`@${handle}`)
      ) {
        detectedMentions.push(member.name);
      }
    });

    sendChatMessage({
      groupId: activeGroupId,
      content,
      mentions: detectedMentions,
      attachment: activeAttachment || undefined,
    });

    setMessageInput("");
    setActiveAttachment(null);
    setIsMentionDropdownOpen(false);
  };

  const handleSendHeartReaction = () => {
    sendChatMessage({
      groupId: activeGroupId,
      content: "Liked this conversation",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentionDropdownOpen && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedMentionIndex((prev) => (prev + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedMentionIndex((prev) =>
          prev <= 0 ? mentionCandidates.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = mentionCandidates[highlightedMentionIndex];
        if (selected) {
          handleSelectMention(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsMentionDropdownOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessageContent = (text: string) => {
    if (!text) return null;
    const tokens = text.split(/(@[a-zA-Z0-9._-]+)(?=\s|$|[.,!?])/g);
    return (
      <span className="whitespace-pre-wrap wrap-break-word leading-relaxed text-[13px] sm:text-sm">
        {tokens.map((token, index) => {
          if (token.startsWith("@")) {
            const raw = token.slice(1).trim().toLowerCase();
            if (raw === "all" || raw === "everyone") {
              return (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#059669] dark:text-[#34D399] font-bold text-xs mr-1 align-baseline border border-emerald-500/30"
                >
                  <Users className="w-3 h-3 stroke-[2.5]" />
                  @all
                </span>
              );
            }
            const matched = groupMembers.find(
              (m) =>
                m.name.toLowerCase() === raw ||
                m.name.toLowerCase().replace(/[^a-z0-9]/g, ".") === raw,
            );
            if (matched) {
              return (
                <span
                  key={index}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/20 font-bold text-xs mr-1 align-baseline"
                >
                  <AtSign className="w-3 h-3 stroke-[2.5]" />
                  {matched.name}
                </span>
              );
            }
            return (
              <span
                key={index}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-primary font-semibold text-xs mr-1 align-baseline"
              >
                {token}
              </span>
            );
          }
          return <React.Fragment key={index}>{token}</React.Fragment>;
        })}
      </span>
    );
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)] md:h-[calc(100vh-4rem)] w-full max-w-7xl mx-auto bg-white dark:bg-[#000000] border-x border-slate-200/80 dark:border-neutral-800 transition-colors select-none">
      <aside
        className={`${
          isMobileInboxView ? "flex" : "hidden md:flex"
        } w-full md:w-[320px] lg:w-90 shrink-0 border-r border-slate-200/80 dark:border-neutral-800 flex-col bg-white dark:bg-[#000000] z-20`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {userProfile.paymentHandle || userProfile.fullName || "Direct"}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleOpenNewChatModal}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-slate-200 flex items-center justify-center transition-colors"
            title="New message"
            aria-label="New message"
          >
            <SquarePen className="w-5 h-5 stroke-2" />
          </button>
        </div>

        <div className="p-3 border-b border-slate-100 dark:border-neutral-800/80">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={inboxSearchQuery}
              onChange={(e) => setInboxSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#EFEFEF] dark:bg-[#262626] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Messages
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            {filteredGroupsList.length} chats
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-transparent thin-scrollbar">
          {filteredGroupsList.map((group) => {
            const isSelected = group.id === activeGroupId;
            const lastData = groupLastMessageMap[group.id];

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  setActiveGroupId(group.id);
                  setIsMobileInboxView(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "bg-[#F3F4F6] dark:bg-[#1A1A1A]"
                    : "hover:bg-slate-50 dark:hover:bg-neutral-900/60"
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#E5E7EB] dark:bg-neutral-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-base border border-slate-200 dark:border-neutral-700">
                    {group.name.slice(0, 1)}
                  </div>
                  <div className="w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-white dark:border-black absolute bottom-0 right-0" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={`text-xs truncate ${
                        isSelected
                          ? "font-extrabold text-slate-900 dark:text-white"
                          : "font-semibold text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {group.name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 shrink-0">
                      {group.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {lastData?.snippet || "No messages"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main
        className={`${
          isMobileInboxView ? "hidden md:flex" : "flex"
        } flex-1 flex-col h-full bg-white dark:bg-[#000000] relative overflow-hidden`}
      >
        <header className="h-16 shrink-0 border-b border-slate-100 dark:border-neutral-800 px-4 flex items-center justify-between bg-white/95 dark:bg-[#000000]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileInboxView(true)}
              className="md:hidden w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-200 flex items-center justify-center -ml-1"
              aria-label="Back to chats"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#E5E7EB] dark:bg-neutral-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-sm border border-slate-200 dark:border-neutral-700">
                {activeGroup?.name?.slice(0, 1) || "G"}
              </div>
              <div className="w-3 h-3 rounded-full bg-[#10B981] border-2 border-white dark:border-black absolute bottom-0 right-0" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
                {activeGroup?.name || "Splitest Chat"}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                <span>Active now</span>
                <span>&bull;</span>
                <span>{groupMembers.length} members</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleOpenAddFriendsModal}
              className="h-8 px-2.5 sm:px-3 rounded-full bg-[#EFEFEF] dark:bg-[#262626] hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Add friends to group"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Friends</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLedgerSettingsModalOpen(true)}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
              title="Ledger Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsGroupInfoOpen(!isGroupInfoOpen)}
              className={`w-8 h-8 rounded-full text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors ${
                isGroupInfoOpen
                  ? "bg-slate-200 dark:bg-neutral-800 text-slate-900 dark:text-white"
                  : "hover:bg-slate-100 dark:hover:bg-neutral-800"
              }`}
              title="Conversation details"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 py-6 space-y-4 thin-scrollbar bg-white dark:bg-[#000000]"
          >
            <div className="flex flex-col items-center justify-center text-center py-6 border-b border-slate-100 dark:border-neutral-900 mb-6">
              <div className="w-16 h-16 rounded-full bg-[#E5E7EB] dark:bg-neutral-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-2xl mb-3 shadow-2xs border border-slate-200 dark:border-neutral-700">
                {activeGroup?.name?.slice(0, 1) || "G"}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {activeGroup?.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Shared expense workspace &bull; {groupMembers.length} members
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setCurrentView("wallet")}
                  className="px-3.5 py-1.5 rounded-full bg-[#EFEFEF] dark:bg-[#262626] text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  View Ledger
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddFriendsModal}
                  className="px-3.5 py-1.5 rounded-full bg-[#EFEFEF] dark:bg-[#262626] text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Search & Add Friends
                </button>
              </div>
            </div>

            {chatMessages.map((msg, index) => {
              const isMe = msg.senderIsCurrentUser;
              const hasLiked =
                msg.likes &&
                (msg.likes.includes(userProfile.fullName || "") ||
                  msg.likes.includes(userProfile.username || "") ||
                  msg.likes.includes(currentMemberName) ||
                  msg.likes.includes("You"));
              const likesCount = msg.likes?.length || 0;

              return (
                <div
                  key={msg.id || index}
                  className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%] group ${
                    isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-neutral-700 overflow-hidden shrink-0 mb-1 border border-slate-200 dark:border-neutral-700">
                      {msg.senderAvatarUrl ? (
                        <img
                          src={msg.senderAvatarUrl}
                          alt={msg.senderName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
                          {msg.senderName.slice(0, 1)}
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={`flex flex-col relative ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    {!isMe && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 mb-1 px-1 font-medium">
                        {msg.senderName}
                      </span>
                    )}

                    <div
                      onDoubleClick={() => toggleChatMessageLike(msg.id)}
                      className={`relative px-4 py-2.5 transition-all text-sm select-text ${
                        isMe
                          ? "bg-[#059669] text-white rounded-[20px] rounded-br-sm"
                          : "bg-[#EFEFEF] dark:bg-[#262626] text-slate-900 dark:text-slate-100 rounded-[20px] rounded-bl-sm"
                      }`}
                    >
                      {msg.content && renderMessageContent(msg.content)}

                      {msg.attachment && (
                        <div
                          className={`mt-2 pt-2 border-t w-full min-w-55 ${
                            isMe
                              ? "border-emerald-600 text-white"
                              : "border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {msg.attachment.type === "expense" && (
                            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-8 h-8 rounded-xl bg-white dark:bg-black/30 text-[#059669] flex items-center justify-center shrink-0">
                                  <Receipt className="w-4 h-4" />
                                </div>
                                <div className="truncate">
                                  <div className="text-xs font-bold truncate">
                                    {msg.attachment.title}
                                  </div>
                                  <div className="text-[10px] opacity-80">
                                    Paid by {msg.attachment.payerName || currentMemberName}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-extrabold tabular-nums">
                                  {formatCurrency(
                                    msg.attachment.amount,
                                    msg.attachment.currencyCode ||
                                      activeCurrency,
                                  )}
                                </div>
                                {msg.attachment.referenceId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (msg.attachment?.referenceId) {
                                        setSelectedExpenseId(
                                          msg.attachment.referenceId,
                                        );
                                        setCurrentView("wallet");
                                      }
                                    }}
                                    className="text-[10px] font-bold underline inline-flex items-center gap-0.5 mt-0.5"
                                  >
                                    Ledger
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {msg.attachment.type === "borrow_request" && (
                            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-8 h-8 rounded-xl bg-white dark:bg-black/30 text-amber-500 flex items-center justify-center shrink-0">
                                  <Handshake className="w-4 h-4" />
                                </div>
                                <div className="truncate">
                                  <div className="text-xs font-bold truncate">
                                    {msg.attachment.title}
                                  </div>
                                  <div className="text-[10px] opacity-80">
                                    Requested from{" "}
                                    {msg.attachment.recipientName}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-extrabold tabular-nums">
                                  {formatCurrency(
                                    msg.attachment.amount,
                                    msg.attachment.currencyCode ||
                                      activeCurrency,
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (msg.attachment) {
                                      setSettlePrefill({
                                        recipient:
                                          msg.attachment.recipientName || currentMemberName,
                                        amount: msg.attachment.amount,
                                      });
                                      setIsSettleModalOpen(true);
                                    }
                                  }}
                                  className="text-[10px] font-bold underline inline-flex items-center gap-0.5 mt-0.5"
                                >
                                  Settle Now
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {likesCount > 0 && (
                        <div
                          className={`absolute -bottom-2 ${
                            isMe ? "left-2" : "right-2"
                          } bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-neutral-700 rounded-full px-1.5 py-0.5 shadow-sm flex items-center gap-1 cursor-pointer`}
                          onClick={() => toggleChatMessageLike(msg.id)}
                        >
                          <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                          {likesCount > 1 && (
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                              {likesCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <LocalTime
                        isoString={msg.createdAt}
                        className="text-[10px] text-slate-400 dark:text-slate-400"
                      />
                      {isMe && (
                        <CheckCheck className="w-3 h-3 text-[#059669] dark:text-[#10B981]" />
                      )}
                      <button
                        type="button"
                        onClick={() => toggleChatMessageLike(msg.id)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:scale-110 ${
                          hasLiked
                            ? "text-rose-500 opacity-100"
                            : "text-slate-400 hover:text-rose-500"
                        }`}
                        title="Like message"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            hasLiked ? "fill-rose-500" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isGroupInfoOpen && (
            <div className="w-64 border-l border-slate-100 dark:border-neutral-800 p-4 space-y-4 bg-white dark:bg-[#000000] overflow-y-auto thin-scrollbar hidden lg:block animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Group Members
                </h4>
                <button
                  type="button"
                  onClick={handleOpenAddFriendsModal}
                  className="text-xs font-bold text-[#059669] hover:underline"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {groupMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-neutral-700"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-400 capitalize block">
                          {member.role}
                        </span>
                      </div>
                    </div>
                    {!isSelf(member.name) && (
                      <button
                        type="button"
                        onClick={() => handleInsertMention(member.name)}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title={`Mention ${member.name}`}
                      >
                        <AtSign className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative p-3 sm:p-4 bg-white dark:bg-[#000000] border-t border-slate-100 dark:border-neutral-900 space-y-2">
          {isMentionDropdownOpen && (
            <div
              ref={mentionDropdownRef}
              className="absolute bottom-full mb-2 left-3 right-3 sm:left-4 sm:right-auto sm:w-80 max-h-72 overflow-y-auto bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-2xl z-40 divide-y divide-slate-100 dark:divide-slate-800/80 animate-scale-in thin-scrollbar"
            >
              <div className="px-3.5 py-2 bg-slate-50/90 dark:bg-slate-900/80 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur-xs z-10 border-b border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-primary" />
                  Mention Member or Group
                </span>
                <span className="text-[10px] font-mono lowercase font-normal text-slate-400">
                  ↑↓ + Enter
                </span>
              </div>

              {mentionCandidates.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No members found matching &ldquo;{mentionQuery}&rdquo;
                </div>
              ) : (
                mentionCandidates.map((candidate, idx) => {
                  const isHighlighted = idx === highlightedMentionIndex;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onMouseEnter={() => setHighlightedMentionIndex(idx)}
                      onClick={() => handleSelectMention(candidate)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                        isHighlighted
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-slate-900 dark:text-white"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {candidate.isAll ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold shrink-0">
                          <Users className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      ) : candidate.avatarUrl ? (
                        <img
                          src={candidate.avatarUrl}
                          alt={candidate.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {candidate.name.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold truncate">
                            {candidate.name}
                          </span>
                          <span className="text-[11px] font-mono text-primary shrink-0">
                            @{candidate.handle}
                          </span>
                        </div>
                        {candidate.subtitle && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 block truncate">
                            {candidate.subtitle}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {activeAttachment && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#EFEFEF] dark:bg-[#262626] border border-slate-200 dark:border-neutral-700 text-xs text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2 truncate">
                {activeAttachment.type === "expense" ? (
                  <Receipt className="w-4 h-4 text-[#059669] dark:text-[#10B981] shrink-0" />
                ) : (
                  <Handshake className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span className="font-semibold truncate">
                  {activeAttachment.title} (
                  {formatCurrency(
                    activeAttachment.amount,
                    activeAttachment.currencyCode,
                  )}
                  )
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveAttachment(null)}
                className="w-6 h-6 rounded-full hover:bg-slate-200 dark:hover:bg-neutral-700 flex items-center justify-center text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 thin-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider shrink-0 px-1">
              Mention:
            </span>
            <button
              type="button"
              onClick={() => handleSelectMention({ id: "all", name: "All members", handle: "all", isAll: true })}
              className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-[#059669] dark:text-[#34D399] hover:bg-emerald-500/20 text-xs font-bold shrink-0 flex items-center gap-1 transition-colors border border-emerald-500/20"
            >
              <Users className="w-3 h-3 stroke-[2.5]" />
              <span>@all</span>
            </button>
            {groupMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => handleInsertMention(member.name)}
                className="px-2.5 py-1 rounded-full bg-[#EFEFEF] dark:bg-[#262626] hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-300 text-xs font-medium shrink-0 flex items-center gap-1 transition-colors"
              >
                <AtSign className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                <span>{member.name}</span>
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 rounded-full border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#121212] px-3.5 py-1.5 shadow-xs focus-within:border-slate-400 dark:focus-within:border-neutral-500 transition-colors">
              <button
                type="button"
                onClick={() => {
                  setAttachTab("expense");
                  setIsAttachModalOpen(true);
                }}
                className="w-7 h-7 rounded-full bg-[#059669] text-white flex items-center justify-center hover:bg-[#047857] transition-colors shrink-0"
                title="Attach Expense or Borrow Request"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={messageInput}
                onChange={handleInputChange}
                onSelect={handleInputSelect}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                className="flex-1 max-h-24 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 outline-none resize-none py-1 leading-relaxed thin-scrollbar"
              />

              {messageInput.trim() || activeAttachment ? (
                <button
                  type="submit"
                  className="text-xs font-bold text-[#059669] dark:text-[#10B981] hover:opacity-80 active:scale-95 px-2 py-1 transition-all shrink-0"
                >
                  Send
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendHeartReaction}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors shrink-0"
                  title="Send heart reaction"
                >
                  <Heart className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
        </div>
      </main>

      {searchFriendsModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in select-none">
          <div
            className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-scale-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setSearchFriendsModalMode(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {searchFriendsModalMode === "new_chat"
                  ? "New message"
                  : "Add people to group"}
              </h2>

              <button
                type="button"
                disabled={selectedFriendNames.length === 0}
                onClick={handleConfirmFriendsModal}
                className={`text-xs font-bold transition-colors ${
                  selectedFriendNames.length > 0
                    ? "text-[#059669] dark:text-[#10B981] hover:underline"
                    : "text-slate-300 dark:text-neutral-600 cursor-not-allowed"
                }`}
              >
                {searchFriendsModalMode === "new_chat" ? "Chat" : "Add"}
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 dark:border-neutral-800 flex items-center flex-wrap gap-2 min-h-12">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 px-1">
                To:
              </span>

              {selectedFriendNames.map((name) => {
                const friendData = allAvailableFriends.find(
                  (f) => f.name === name,
                );
                return (
                  <div
                    key={name}
                    className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-[#D1FAE5] dark:bg-[#064E3B]/70 text-[#065F46] dark:text-[#A7F3D0] text-xs font-semibold"
                  >
                    {friendData?.avatarUrl && (
                      <img
                        src={friendData.avatarUrl}
                        alt={name}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    )}
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFriendChip(name)}
                      className="w-4 h-4 rounded-full hover:bg-emerald-200/60 dark:hover:bg-emerald-800 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              <input
                ref={searchInputRef}
                type="text"
                value={friendSearchQuery}
                onChange={(e) => setFriendSearchQuery(e.target.value)}
                placeholder={
                  selectedFriendNames.length === 0
                    ? "Search friends..."
                    : "Add more..."
                }
                className="flex-1 min-w-35 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1"
              />
            </div>

            {searchFriendsModalMode === "new_chat" &&
              selectedFriendNames.length > 1 && (
                <div className="px-4 py-3 bg-slate-50 dark:bg-neutral-900/50 border-b border-slate-100 dark:border-neutral-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={newChatGroupName}
                    onChange={(e) => setNewChatGroupName(e.target.value)}
                    placeholder="Group name (optional)"
                    className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                  <select
                    value={newChatCategory}
                    onChange={(e) => setNewChatCategory(e.target.value)}
                    className="h-9 px-2 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="Trip">Trip</option>
                    <option value="Home">Home</option>
                    <option value="Dining">Dining</option>
                    <option value="Project">Project</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

            <div className="px-4 py-2 flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              <span>Suggested Friends</span>
              <button
                type="button"
                onClick={() => {
                  setSearchFriendsModalMode(null);
                  setIsAddFriendModalOpen(true);
                }}
                className="text-primary hover:underline lowercase font-semibold tracking-normal flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                Add via username/link
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-800/60 thin-scrollbar">
              {filteredFriendsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No friends found matching &ldquo;{friendSearchQuery}&rdquo;
                </div>
              ) : (
                filteredFriendsList.map((friend) => {
                  const isAlreadyInCurrentGroup =
                    searchFriendsModalMode === "add_to_group" &&
                    activeGroupMemberNamesSet.has(friend.name.toLowerCase());
                  const isSelected = selectedFriendNames.includes(friend.name);

                  return (
                    <button
                      key={friend.name}
                      type="button"
                      disabled={isAlreadyInCurrentGroup}
                      onClick={() => handleToggleSelectFriend(friend.name)}
                      className={`w-full flex items-center justify-between p-3.5 text-left transition-colors ${
                        isAlreadyInCurrentGroup
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-slate-50 dark:hover:bg-neutral-800/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={friend.avatarUrl}
                            alt={friend.name}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-neutral-700"
                          />
                          <div className="w-3 h-3 rounded-full bg-[#10B981] border-2 border-white dark:border-[#1C1C1E] absolute bottom-0 right-0" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {friend.name}
                            </span>
                            {friend.username && (
                              <span className="text-[10px] font-mono text-primary font-medium truncate">
                                @{friend.username}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
                            {friend.email}
                          </div>
                          {isAlreadyInCurrentGroup && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
                              Already in this group
                            </span>
                          )}
                        </div>
                      </div>

                      {!isAlreadyInCurrentGroup && (
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-[#059669] border-[#059669] text-white"
                              : "border-slate-300 dark:border-neutral-600 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-3" />}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-900/40">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedFriendNames.length} selected
              </span>
              <button
                type="button"
                disabled={selectedFriendNames.length === 0}
                onClick={handleConfirmFriendsModal}
                className="px-5 h-9 rounded-full bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                {searchFriendsModalMode === "new_chat"
                  ? "Start Chat"
                  : "Add to Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAttachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
          <div
            className="w-full max-w-md bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-scale-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Attach Financial Item
              </h3>
              <button
                type="button"
                onClick={() => setIsAttachModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setAttachTab("expense")}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                  attachTab === "expense"
                    ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Expense Note
              </button>
              <button
                type="button"
                onClick={() => setAttachTab("borrow")}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                  attachTab === "borrow"
                    ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Borrow Request
              </button>
            </div>

            {attachTab === "expense" && (
              <div className="space-y-4">
                {expenses.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Select Existing Ledger Expense
                    </label>
                    <div className="max-h-36 overflow-y-auto space-y-1 thin-scrollbar">
                      {expenses.slice(0, 5).map((exp) => (
                        <button
                          key={exp.id}
                          type="button"
                          onClick={() => handleAttachExistingExpense(exp.id)}
                          className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs transition-colors"
                        >
                          <span className="font-semibold truncate">
                            {exp.description}
                          </span>
                          <span className="font-bold text-[#059669] dark:text-[#10B981] shrink-0 tabular-nums">
                            {formatCurrency(exp.amount, exp.currencyCode)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form
                  onSubmit={handleAttachCustomExpense}
                  className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800"
                >
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Or Mention New Spending
                  </span>
                  <div>
                    <input
                      type="text"
                      required
                      value={customExpenseTitle}
                      onChange={(e) => setCustomExpenseTitle(e.target.value)}
                      placeholder="Expense title (e.g. Airport Taxi)"
                      className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={customExpenseAmount}
                      onChange={(e) => setCustomExpenseAmount(e.target.value)}
                      placeholder={`Amount (${activeCurrency})`}
                      className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
                    />
                    <select
                      value={customExpensePayer}
                      onChange={(e) => setCustomExpensePayer(e.target.value)}
                      className="h-9 px-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
                    >
                      {groupMembers.map((m) => (
                        <option key={m.id} value={m.name}>
                          Paid by {m.name}{isSelf(m.name) && !m.name.includes("(You)") ? " (You)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full h-9 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    Attach to Message
                  </button>
                </form>
              </div>
            )}

            {attachTab === "borrow" && (
              <form onSubmit={handleAttachBorrowRequest} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Request From
                  </label>
                  <select
                    value={borrowTargetMember}
                    onChange={(e) => setBorrowTargetMember(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    {groupMembers
                      .filter((m) => !isSelf(m.name))
                      .map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    placeholder={`Borrow amount (${activeCurrency})`}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={borrowPurpose}
                    onChange={(e) => setBorrowPurpose(e.target.value)}
                    placeholder="Purpose (e.g. Need cash for cab)"
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm"
                >
                  Attach Borrow Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
