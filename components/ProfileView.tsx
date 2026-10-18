"use client";

import React, { useState } from "react";
import { useSplitest } from "@/lib/store";
import { buildProfileShareUrl } from "@/lib/users-directory";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Globe,
  Bell,
  CheckCircle2,
  Save,
  Send,
  Sun,
  Moon,
  Monitor,
  Share2,
  Copy,
  Check,
  ExternalLink,
  AtSign,
} from "lucide-react";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
];

export function ProfileView() {
  const {
    userProfile,
    updateUserProfile,
    syncGoogleAccount,
    disconnectGoogleAccount,
    sendTestNotification,
    showToast,
    theme,
    setTheme,
    setIsShareProfileModalOpen,
  } = useSplitest();

  const [fullName, setFullName] = useState(userProfile.fullName);
  const [username, setUsername] = useState(userProfile.username || userProfile.paymentHandle || "you.splitest");
  const [email, setEmail] = useState(userProfile.email);
  const [phone, setPhone] = useState(userProfile.phone || "");
  const [paymentHandle, setPaymentHandle] = useState(
    userProfile.paymentHandle || "",
  );
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl);
  const [customAvatarInput, setCustomAvatarInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const [notifyOnExpense, setNotifyOnExpense] = useState(
    userProfile.notifyOnExpense,
  );
  const [notifyOnSettlement, setNotifyOnSettlement] = useState(
    userProfile.notifyOnSettlement,
  );
  const [notifyOnMention, setNotifyOnMention] = useState(
    userProfile.notifyOnMention,
  );
  const [notifyWeeklyDigest, setNotifyWeeklyDigest] = useState(
    userProfile.notifyWeeklyDigest,
  );

  const [isSendingTest, setIsSendingTest] = useState(false);

  const currentProfileUrl = buildProfileShareUrl(username || "you.splitest");

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentProfileUrl);
      setCopiedLink(true);
      showToast("Profile link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast("Could not copy link to clipboard");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      fullName,
      username: username.trim().toLowerCase(),
      email,
      phone,
      paymentHandle,
      avatarUrl: customAvatarInput.trim() || avatarUrl,
      themePreference: theme,
      notifyOnExpense,
      notifyOnSettlement,
      notifyOnMention,
      notifyWeeklyDigest,
    });
  };

  const handleTestNotification = async () => {
    setIsSendingTest(true);
    await sendTestNotification();
    setTimeout(() => setIsSendingTest(false), 500);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-6 px-4 md:px-6 select-none transition-colors duration-150">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Profile & Preferences
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Customize your personal identity, theme appearance, and Google sync
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative group">
              <img
                src={customAvatarInput.trim() || avatarUrl}
                alt={fullName}
                className="w-20 h-20 rounded-3xl object-cover border-2 border-emerald-100 dark:border-emerald-800 shadow-md"
              />
            </div>

            <div className="flex-1 space-y-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {fullName || "Your Name"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {email || "you@example.com"}
              </p>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                  Preset Avatars
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAvatarUrl(url);
                        setCustomAvatarInput("");
                      }}
                      className={`w-9 h-9 rounded-2xl overflow-hidden border-2 transition-all ${
                        (customAvatarInput.trim() || avatarUrl) === url
                          ? "border-[#059669] ring-2 ring-emerald-200 dark:ring-emerald-800 scale-105"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={url}
                        alt="Preset avatar"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Custom Avatar Image URL
            </label>
            <input
              type="url"
              value={customAvatarInput}
              onChange={(e) => setCustomAvatarInput(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Name"
                className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Contact Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-slate-400" />
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-mono text-slate-400 pointer-events-none">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  placeholder="your.username"
                  className="w-full h-11 pl-8 pr-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Settlement Payment Handle
              </label>
              <input
                type="text"
                value={paymentHandle}
                onChange={(e) => setPaymentHandle(e.target.value)}
                placeholder="e.g., yourname.splitest"
                className="w-full h-11 px-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Profile Sharing & Friends Link
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Share your personal link so friends can find and add you directly
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsShareProfileModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Link
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                Canonical Profile Link
              </span>
              <span className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 select-all block truncate">
                {currentProfileUrl}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors bg-white dark:bg-slate-800"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    Copy
                  </>
                )}
              </button>

              <a
                href={`/u/${username || 'you.splitest'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors bg-white dark:bg-slate-800"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                Preview Card
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Theme Appearance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose how Splitest looks on your screen across all viewports
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                theme === "light"
                  ? "border-[#059669] bg-[#D1FAE5]/40 text-[#065F46] ring-2 ring-[#059669]"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Light Theme</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Crisp white Material 3 surfaces</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                theme === "dark"
                  ? "border-[#10B981] bg-[#064E3B]/40 text-[#A7F3D0] ring-2 ring-[#10B981]"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Dark Theme</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Deep OLED slate tonal elevation</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                theme === "system"
                  ? "border-[#059669] bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">System (Auto)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Follow device OS schedule</div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 32 32"
                  className="w-6 h-6"
                >
                  <path
                    d="M23.75,16A7.7446,7.7446,0,0,1,8.7177,18.6259L4.2849,22.1721A13.244,13.244,0,0,0,29.25,16"
                    fill="#00ac47"
                  />
                  <path
                    d="M23.75,16a7.7387,7.7387,0,0,1-3.2516,6.2987l4.3824,3.5059A13.2042,13.2042,0,0,0,29.25,16"
                    fill="#4285f4"
                  />
                  <path
                    d="M8.25,16a7.698,7.698,0,0,1,.4677-2.6259L4.2849,9.8279a13.177,13.177,0,0,0,0,12.3442l4.4328-3.5462A7.698,7.698,0,0,1,8.25,16Z"
                    fill="#ffba00"
                  />
                  <path
                    d="M16,8.25a7.699,7.699,0,0,1,4.558,1.4958l4.06-3.7893A13.2152,13.2152,0,0,0,4.2849,9.8279l4.4328,3.5462A7.756,7.756,0,0,1,16,8.25Z"
                    fill="#ea4435"
                  />
                  <path
                    d="M29.25,15v1L27,19.5H16.5V14H28.25A1,1,0,0,1,29.25,15Z"
                    fill="#4285f4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Google Account Sync
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Synchronize contacts, drive exports, and authentication
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {userProfile.googleConnected ? (
                <span className="text-xs font-semibold text-[#065F46] dark:text-[#A7F3D0] bg-[#D1FAE5] dark:bg-[#064E3B]/70 border border-[#A7F3D0] dark:border-[#059669] px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Synced
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  Disconnected
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {userProfile.googleConnected
                  ? userProfile.googleEmail || userProfile.email
                  : "No Google account linked"}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {userProfile.googleConnected
                  ? "Active session token with profile avatar and contact sharing enabled"
                  : "Connect your Google account for single-tap login across all devices"}
              </span>
            </div>

            {userProfile.googleConnected ? (
              <button
                type="button"
                onClick={disconnectGoogleAccount}
                className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={syncGoogleAccount}
                className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 flex items-center gap-2"
              >
                <Globe className="w-3.5 h-3.5 text-blue-400 dark:text-white" />
                <span>Connect Google</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Notifications & Alerts
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Control browser push notifications and real-time expense alerts
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isSendingTest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-[#065F46] dark:text-[#A7F3D0] hover:bg-emerald-100 text-xs font-bold transition-all disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>{isSendingTest ? "Sending..." : "Test Push"}</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Expense Creation & Edits
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Receive alerts when group members add or update expenses
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnExpense}
                onChange={(e) => setNotifyOnExpense(e.target.checked)}
                className="w-4 h-4 text-[#059669] rounded-md border-slate-300 dark:border-slate-700 focus:ring-[#059669]"
              />
            </label>

            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Debt Settlement Requests
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Notify immediately when debts are settled or payment is requested
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnSettlement}
                onChange={(e) => setNotifyOnSettlement(e.target.checked)}
                className="w-4 h-4 text-[#059669] rounded-md border-slate-300 dark:border-slate-700 focus:ring-[#059669]"
              />
            </label>

            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Chat Mentions (@You)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  High priority alert when someone mentions you in a group chat
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnMention}
                onChange={(e) => setNotifyOnMention(e.target.checked)}
                className="w-4 h-4 text-[#059669] rounded-md border-slate-300 dark:border-slate-700 focus:ring-[#059669]"
              />
            </label>

            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Weekly Summary Digest
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Summary of net debt positions and outstanding balances
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifyWeeklyDigest}
                onChange={(e) => setNotifyWeeklyDigest(e.target.checked)}
                className="w-4 h-4 text-[#059669] rounded-md border-slate-300 dark:border-slate-700 focus:ring-[#059669]"
              />
            </label>
          </div>
        </div>


        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save All Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
