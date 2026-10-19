"use client";

import React, { useState } from "react";
import { useSplitest } from "@/lib/store";
import { InAppNotification } from "@/types";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Receipt,
  Handshake,
  MessageSquare,
  UserPlus,
  Sparkles,
  Volume2,
} from "lucide-react";

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function NotificationTypeIcon({ type }: { type: InAppNotification["type"] }) {
  switch (type) {
    case "expense":
      return (
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Receipt className="w-4 h-4" />
        </div>
      );
    case "settlement":
      return (
        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Handshake className="w-4 h-4" />
        </div>
      );
    case "chat":
    case "comment":
      return (
        <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-950/70 border border-violet-200/80 dark:border-violet-800/80 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4" />
        </div>
      );
    case "invite":
      return (
        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200/80 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <UserPlus className="w-4 h-4" />
        </div>
      );
    case "system":
    default:
      return (
        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
      );
  }
}

export function NotificationCenterModal() {
  const {
    notifications,
    unreadNotificationsCount,
    isNotificationCenterOpen,
    setIsNotificationCenterOpen,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    deleteNotification,
    setActiveGroupId,
    setCurrentView,
    sendTestNotification,
  } = useSplitest();

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  if (!isNotificationCenterOpen) return null;

  const filteredNotifications = notifications.filter((item) =>
    activeTab === "unread" ? !item.read : true
  );

  const handleNotificationClick = (item: InAppNotification) => {
    navigator.vibrate?.(10);
    markNotificationAsRead(item.id);

    if (item.groupId) {
      setActiveGroupId(item.groupId);
      if (item.type === "chat") {
        setCurrentView("chat");
      } else {
        setCurrentView("wallet");
      }
      setIsNotificationCenterOpen(false);
    }
  };

  const handleClose = () => {
    navigator.vibrate?.(10);
    setIsNotificationCenterOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center select-none animate-fade-in">
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      <div className="relative w-full sm:max-w-md bg-white dark:bg-[#1E293B] rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xl z-10 flex flex-col max-h-[88vh] sm:max-h-[82vh] overflow-hidden">
        <div className="flex sm:hidden justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <div className="px-5 pt-3 sm:pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-[#059669] dark:text-[#34D399] flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Notifications
              </h2>
              {unreadNotificationsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                  {unreadNotificationsCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  navigator.vibrate?.(10);
                  sendTestNotification();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-90"
                title="Send test chime and notification"
                aria-label="Send test notification"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>

              {unreadNotificationsCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.vibrate?.(10);
                    markAllNotificationsAsRead();
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-90"
                  title="Mark all as read"
                  aria-label="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.vibrate?.(10);
                    clearNotifications();
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-all active:scale-90"
                  title="Clear all notifications"
                  aria-label="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-all active:scale-90"
                aria-label="Close notification center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 mt-3 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                navigator.vibrate?.(10);
                setActiveTab("all");
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.vibrate?.(10);
                setActiveTab("unread");
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "unread"
                  ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Unread ({unreadNotificationsCount})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y-0">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {activeTab === "unread" ? "No unread alerts" : "All caught up"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
                {activeTab === "unread"
                  ? "You have acknowledged every notification. Select 'All' to review historical ledger alerts."
                  : "Expenses, settlements, notes, and invites will appear here in real time with acoustic chimes."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 active:scale-[0.99] ${
                  item.read
                    ? "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/70 opacity-80 hover:opacity-100"
                    : "bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 shadow-xs ring-1 ring-emerald-500/10"
                }`}
              >
                <NotificationTypeIcon type={item.type} />

                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>

                  {item.actorName && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                      <span>From {item.actorName}</span>
                    </div>
                  )}
                </div>

                {!item.read && (
                  <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950" />
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.vibrate?.(10);
                    deleteNotification(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute bottom-3 right-3 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-all"
                  aria-label="Delete notification"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
