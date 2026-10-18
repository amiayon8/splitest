"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSplitest } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import { LocalTime } from "@/lib/timezone";
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
  ChevronDown,
  DollarSign,
  FolderPlus,
} from "lucide-react";

export function GroupChatView() {
  const {
    groups,
    activeGroupId,
    setActiveGroupId,
    activeGroup,
    chatMessages,
    sendChatMessage,
    createGroupFromChat,
    expenses,
    setSelectedExpenseId,
    setCurrentView,
    setIsSettleModalOpen,
    setSettlePrefill,
    activeCurrency,
  } = useSplitest();

  const [messageInput, setMessageInput] = useState("");
  const [activeAttachment, setActiveAttachment] = useState<ChatAttachment | null>(null);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachTab, setAttachTab] = useState<"expense" | "borrow">("expense");
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

  const [customExpenseTitle, setCustomExpenseTitle] = useState("");
  const [customExpenseAmount, setCustomExpenseAmount] = useState("");
  const [customExpensePayer, setCustomExpensePayer] = useState("You");

  const [borrowTargetMember, setBorrowTargetMember] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [borrowPurpose, setBorrowPurpose] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("Trip");
  const [newGroupMembersText, setNewGroupMembersText] = useState("Alex Rivera, Sarah Chen, Sophia Taylor");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const groupMembers = useMemo(() => {
    return activeGroup?.members || [];
  }, [activeGroup]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleInsertMention = (memberName: string) => {
    const mentionTag = `@${memberName} `;
    setMessageInput((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${mentionTag}`);
    textareaRef.current?.focus();
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
    if (!customExpenseTitle.trim() || isNaN(amountNum) || amountNum <= 0) return;
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
    const recipient = borrowTargetMember || groupMembers.find((m) => m.name !== "You")?.name || "Group";
    setActiveAttachment({
      type: "borrow_request",
      title: borrowPurpose.trim() || "Borrow Request",
      amount: amountNum,
      currencyCode: activeCurrency,
      recipientName: recipient,
      payerName: "You",
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
    groupMembers.forEach((member) => {
      if (content.toLowerCase().includes(`@${member.name.toLowerCase()}`)) {
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const memberArray = newGroupMembersText
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const createdId = createGroupFromChat(newGroupName.trim(), newGroupCategory, memberArray);
    setIsCreateGroupModalOpen(false);
    setNewGroupName("");
    setActiveGroupId(createdId);
  };

  const renderMessageContent = (text: string) => {
    if (!text) return null;
    const tokens = text.split(/(@[a-zA-Z0-9_\s]+?)(?=\s|$|[.,!?])/g);
    return (
      <span className="whitespace-pre-wrap break-words leading-relaxed text-sm">
        {tokens.map((token, index) => {
          if (token.startsWith("@")) {
            const rawName = token.slice(1).trim();
            const matched = groupMembers.find(
              (m) => m.name.toLowerCase() === rawName.toLowerCase()
            );
            if (matched) {
              return (
                <span
                  key={index}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100/90 text-emerald-900 font-bold text-xs mr-1 align-baseline border border-emerald-200"
                >
                  <AtSign className="w-3 h-3 stroke-[2.5]" />
                  {matched.name}
                </span>
              );
            }
          }
          return <React.Fragment key={index}>{token}</React.Fragment>;
        })}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white max-w-5xl mx-auto border-x border-slate-200/80">
      <header className="h-16 shrink-0 border-b border-slate-200/80 px-4 flex items-center justify-between bg-white/95 backdrop-blur-sm z-10">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl hover:bg-slate-100 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-[#059669] flex items-center justify-center font-bold text-sm shrink-0">
              {activeGroup?.name?.slice(0, 1) || "G"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                  {activeGroup?.name || "Select Group"}
                </h1>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {groupMembers.length} participants &bull; {activeGroup?.category || "Group"}
              </p>
            </div>
          </button>

          {isGroupDropdownOpen && (
            <div className="absolute top-12 left-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-30 animate-in fade-in zoom-in-95">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Switch Group Ledger
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 thin-scrollbar">
                {groups.map((group) => {
                  const isCurrent = group.id === activeGroupId;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => {
                        setActiveGroupId(group.id);
                        setIsGroupDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                        isCurrent
                          ? "bg-emerald-50 text-[#065F46] font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                        {group.name.slice(0, 1)}
                      </div>
                      <span className="truncate">{group.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateGroupModalOpen(true)}
            className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-98"
          >
            <FolderPlus className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">New Group from Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentView("wallet")}
            className="h-9 px-3 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-98 shadow-sm"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Ledger</span>
          </button>
        </div>
      </header>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar bg-[#F8FAFC]"
      >
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#059669] flex items-center justify-center mb-3 border border-emerald-100">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Welcome to {activeGroup?.name || "Group"} Chat
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Share updates, coordinate expenses, request borrowing, and mention members to keep shared tabs aligned.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-md">
              <button
                type="button"
                onClick={() => {
                  const firstFriend = groupMembers.find((m) => m.name !== "You")?.name || "Alex";
                  handleInsertMention(firstFriend);
                }}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs hover:border-emerald-500 hover:text-[#059669] transition-all"
              >
                Mention a friend
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttachTab("expense");
                  setIsAttachModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs hover:border-emerald-500 hover:text-[#059669] transition-all"
              >
                Attach an expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttachTab("borrow");
                  setIsAttachModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs hover:border-emerald-500 hover:text-[#059669] transition-all"
              >
                Request borrowing
              </button>
            </div>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.senderIsCurrentUser;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-2xl ${
                  isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0 mt-1 border border-slate-200">
                    {msg.senderAvatarUrl ? (
                      <img
                        src={msg.senderAvatarUrl}
                        alt={msg.senderName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600">
                        {msg.senderName.slice(0, 1)}
                      </span>
                    )}
                  </div>
                )}

                <div
                  className={`flex flex-col space-y-1.5 ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-semibold text-slate-600">
                      {isMe ? "You" : msg.senderName}
                    </span>
                    <LocalTime
                      isoString={msg.createdAt}
                      className="text-[10px] text-slate-400 tabular-nums"
                    />
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl shadow-xs transition-all ${
                      isMe
                        ? "bg-[#D1FAE5] text-[#065F46] rounded-tr-xs border border-emerald-200"
                        : "bg-white text-slate-800 rounded-tl-xs border border-slate-200/80"
                    }`}
                  >
                    {msg.content && renderMessageContent(msg.content)}

                    {msg.attachment && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 w-full min-w-[240px]">
                        {msg.attachment.type === "expense" && (
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 text-slate-800">
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0">
                                <Receipt className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold truncate">
                                  {msg.attachment.title}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Paid by {msg.attachment.payerName || "You"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-extrabold text-[#059669] tabular-nums">
                                {formatCurrency(
                                  msg.attachment.amount,
                                  msg.attachment.currencyCode || activeCurrency
                                )}
                              </div>
                              {msg.attachment.referenceId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (msg.attachment?.referenceId) {
                                      setSelectedExpenseId(msg.attachment.referenceId);
                                      setCurrentView("wallet");
                                    }
                                  }}
                                  className="text-[10px] font-bold text-slate-500 hover:text-slate-900 inline-flex items-center gap-0.5 mt-0.5"
                                >
                                  Ledger
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {msg.attachment.type === "borrow_request" && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                <Handshake className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold truncate">
                                  {msg.attachment.title}
                                </div>
                                <div className="text-[10px] text-amber-800">
                                  Borrow requested from {msg.attachment.recipientName}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-extrabold text-amber-800 tabular-nums">
                                {formatCurrency(
                                  msg.attachment.amount,
                                  msg.attachment.currencyCode || activeCurrency
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (msg.attachment) {
                                    setSettlePrefill({
                                      recipient: msg.attachment.recipientName || "You",
                                      amount: msg.attachment.amount,
                                    });
                                    setIsSettleModalOpen(true);
                                  }
                                }}
                                className="text-[10px] font-bold text-amber-900 underline inline-flex items-center gap-0.5 mt-0.5"
                              >
                                Settle Now
                              </button>
                            </div>
                          </div>
                        )}

                        {msg.attachment.type === "settlement" && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#059669] flex items-center justify-center shrink-0">
                                <CheckCheck className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold truncate">
                                  {msg.attachment.title}
                                </div>
                                <div className="text-[10px] text-emerald-800">
                                  Settled between {msg.attachment.payerName} and {msg.attachment.recipientName}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs font-extrabold text-[#059669] tabular-nums shrink-0">
                              {formatCurrency(
                                msg.attachment.amount,
                                msg.attachment.currencyCode || activeCurrency
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 p-3 bg-white border-t border-slate-200/80 space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 thin-scrollbar">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 px-1">
            Mention:
          </span>
          {groupMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => handleInsertMention(member.name)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium shrink-0 flex items-center gap-1 transition-colors"
            >
              <AtSign className="w-3 h-3 text-slate-400" />
              <span>{member.name}</span>
            </button>
          ))}
        </div>

        {activeAttachment && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <div className="flex items-center gap-2 truncate">
              {activeAttachment.type === "expense" ? (
                <Receipt className="w-4 h-4 text-[#059669] shrink-0" />
              ) : (
                <Handshake className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="font-semibold truncate">
                {activeAttachment.title} ({formatCurrency(activeAttachment.amount, activeAttachment.currencyCode)})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveAttachment(null)}
              className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAttachTab("expense");
                setIsAttachModalOpen(true);
              }}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              title="Attach spending or expense"
            >
              <DollarSign className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setAttachTab("borrow");
                setIsAttachModalOpen(true);
              }}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              title="Request borrowing or settle"
            >
              <Handshake className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${activeGroup?.name || "chat"}, mention @someone...`}
              className="w-full resize-none rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#059669] focus:ring-2 focus:ring-emerald-100 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={!messageInput.trim() && !activeAttachment}
            className="w-10 h-10 rounded-2xl bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:hover:bg-[#059669] text-white flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {isAttachModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAttachTab("expense")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    attachTab === "expense"
                      ? "bg-[#D1FAE5] text-[#065F46]"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Spend / Expense
                </button>
                <button
                  type="button"
                  onClick={() => setAttachTab("borrow")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    attachTab === "borrow"
                      ? "bg-amber-100 text-amber-900"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Borrow / Settle
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsAttachModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {attachTab === "expense" ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">
                      Attach from Group Ledger
                    </h4>
                    {expenses.length === 0 ? (
                      <p className="text-xs text-slate-400">No expenses recorded in this group yet.</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 thin-scrollbar">
                        {expenses.slice(0, 5).map((exp) => (
                          <button
                            key={exp.id}
                            type="button"
                            onClick={() => handleAttachExistingExpense(exp.id)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 hover:border-emerald-500 text-left transition-all"
                          >
                            <div className="truncate pr-2">
                              <div className="text-xs font-semibold text-slate-800 truncate">
                                {exp.description}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {exp.date} &bull; Paid by {exp.paidByName}
                              </div>
                            </div>
                            <span className="text-xs font-bold text-[#059669] tabular-nums shrink-0">
                              {formatCurrency(exp.amount, exp.currencyCode)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                      Or Mention New Spending
                    </span>
                  </div>

                  <form onSubmit={handleAttachCustomExpense} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Spending Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Coffee, Taxi, Dinner"
                        value={customExpenseTitle}
                        onChange={(e) => setCustomExpenseTitle(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#059669] outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Amount ({activeCurrency})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={customExpenseAmount}
                          onChange={(e) => setCustomExpenseAmount(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#059669] outline-none font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Paid By
                        </label>
                        <select
                          value={customExpensePayer}
                          onChange={(e) => setCustomExpensePayer(e.target.value)}
                          className="w-full h-9 px-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#059669] outline-none"
                        >
                          {groupMembers.map((m) => (
                            <option key={m.id} value={m.name}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!customExpenseTitle.trim() || !customExpenseAmount}
                      className="w-full h-9 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white font-semibold text-xs transition-all"
                    >
                      Attach to Chat
                    </button>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleAttachBorrowRequest} className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Request money to borrow or signal a pending repayment from a group peer.
                  </p>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Request Borrowing From
                    </label>
                    <select
                      value={borrowTargetMember}
                      onChange={(e) => setBorrowTargetMember(e.target.value)}
                      className="w-full h-9 px-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#059669] outline-none"
                    >
                      {groupMembers
                        .filter((m) => m.name !== "You")
                        .map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Amount ({activeCurrency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={borrowAmount}
                      onChange={(e) => setBorrowAmount(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#059669] outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Purpose / Reason
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Short for lunch, Event ticket"
                      value={borrowPurpose}
                      onChange={(e) => setBorrowPurpose(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#059669] outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!borrowAmount}
                    className="w-full h-9 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs transition-all"
                  >
                    Attach Borrow Request
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#059669]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Create Group from Chat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Group Ledger Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Tokyo Adventure, Apartment 4B"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#059669] outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Category
                </label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full h-10 px-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#059669] outline-none"
                >
                  <option value="Trip">Trip & Travel</option>
                  <option value="Home">Home & Rent</option>
                  <option value="Couple">Couple & Dating</option>
                  <option value="Project">Project & Team</option>
                  <option value="Other">Other Community</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Group Members (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Alex Rivera, Sarah Chen, Sophia Taylor"
                  value={newGroupMembersText}
                  onChange={(e) => setNewGroupMembersText(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-[#059669] outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  You are automatically included as the group owner.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupModalOpen(false)}
                  className="px-4 h-9 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="px-4 h-9 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-sm"
                >
                  Create & Launch Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
