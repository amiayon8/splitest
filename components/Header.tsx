"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSplitest } from "@/lib/store";
import {
  Search,
  Users,
  UserCheck,
  User,
  MessageSquare,
  Bell,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

export function Header() {
  const router = useRouter();
  const {
    currentView,
    setCurrentView,
    segment,
    setSegment,
    searchQuery,
    setSearchQuery,
    userProfile,
    syncGoogleAccount,
    sendTestNotification,
    theme,
    setTheme,
  } = useSplitest();

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleNextTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 select-none transition-colors duration-150">
      <div className="h-16 w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentView("wallet")}
            className="hidden md:flex items-center gap-2.5 text-left focus:outline-none"
          >
            <img
              src="/Splitest.svg"
              alt="Splitest"
              className="w-10 h-10 object-contain shadow-xs"
            />
            <div className="flex flex-col">
              <span className="text-[17px] text-slate-900 dark:text-slate-100 font-bold tracking-tight leading-none">
                Splitest
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-0.5">
                Material You Ledger
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center justify-center">
          <div className="bg-[#F1F5F9] dark:bg-slate-800/90 p-1 rounded-full flex items-center border border-slate-200/60 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setSegment("groups");
                if (currentView !== "wallet" && currentView !== "expenses") {
                  setCurrentView("wallet");
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                segment === "groups"
                  ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#059669] dark:text-[#10B981]" />
              <span>Groups</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSegment("friends");
                if (currentView !== "groups") {
                  setCurrentView("groups");
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                segment === "friends"
                  ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-[#059669] dark:text-[#10B981]" />
              <span>Friends</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSearchOpen ? (
            <div className="relative flex items-center animate-fade-in">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setIsSearchOpen(false)}
                placeholder="Search..."
                className="w-36 sm:w-48 h-8 px-3 pr-7 rounded-full bg-[#F1F5F9] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669]"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-9 h-9 rounded-full bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Search transactions"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleNextTheme}
            className="w-9 h-9 rounded-full bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            title={`Current theme: ${theme}. Click to switch.`}
            aria-label="Toggle theme appearance"
          >
            {theme === "dark" ? (
              <Moon className="w-4 h-4 text-emerald-400" />
            ) : theme === "light" ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Monitor className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            )}
          </button>

          <div className="relative flex items-center pl-1">
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="w-9 h-9 rounded-full ring-2 ring-emerald-200 dark:ring-emerald-800 hover:ring-[#059669] transition-all overflow-hidden focus:outline-none shadow-2xs shrink-0"
              aria-label="Profile menu"
            >
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.fullName}
                className="w-full h-full object-cover"
              />
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 top-12 w-72 bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/90 dark:border-slate-700 shadow-xl py-2 z-50 animate-fade-in divide-y divide-slate-100 dark:divide-slate-800">
                <div className="px-4 py-3 flex items-center gap-3">
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.fullName}
                    className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {userProfile.fullName}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {userProfile.email}
                    </p>
                  </div>
                </div>

                <div className="py-2 px-3">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Theme Appearance
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        theme === "light"
                          ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        theme === "dark"
                          ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("system")}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        theme === "system"
                          ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5 text-blue-500" />
                      <span>Auto</span>
                    </button>
                  </div>
                </div>

                <div className="py-1 px-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView("profile");
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                    <span>Your Profile & Customization</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView("chat");
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                  >
                    <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                    <span>Group Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sendTestNotification();
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                  >
                    <Bell className="w-4 h-4 text-[#059669] dark:text-[#10B981]" />
                    <span>Send Notification</span>
                  </button>

                  {!userProfile.googleConnected && (
                    <button
                      type="button"
                      onClick={() => {
                        syncGoogleAccount();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-blue-500" />
                      <span>Sync with Google Account</span>
                    </button>
                  )}
                </div>

                <div className="pt-1 px-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      document.cookie = "splitest_session=; path=/; max-age=0";
                      router.push("/login");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
