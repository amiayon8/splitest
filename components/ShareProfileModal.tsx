"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useSplitest } from "@/lib/store";
import { buildProfileShareUrl } from "@/lib/users-directory";
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function ShareProfileModal() {
  const {
    userProfile,
    isShareProfileModalOpen,
    setIsShareProfileModalOpen,
    showToast,
  } = useSplitest();
  const [copied, setCopied] = useState(false);

  if (!isShareProfileModalOpen) return null;

  const currentUsername =
    userProfile.username ||
    userProfile.paymentHandle ||
    (userProfile.fullName ? userProfile.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.') : 'user');
  const profileUrl = buildProfileShareUrl(currentUsername);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      showToast("Profile link copied to clipboard");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      showToast("Could not copy automatically. Please copy the URL below.");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${userProfile.fullName || 'User'} on Splitest`,
          text: `Add me on Splitest to split expenses and manage shared group tabs effortlessly: @${currentUsername}`,
          url: profileUrl,
        });
        showToast("Profile shared");
      } catch {
        return;
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={() => setIsShareProfileModalOpen(false)}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-primary via-emerald-400 to-teal-500" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Share Your Profile
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Invite friends to connect on Splitest
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsShareProfileModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 mb-5">
          <div className="flex items-center gap-3.5 mb-3">
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-primary/30 shrink-0 bg-slate-200 dark:bg-slate-700">
              {userProfile.avatarUrl ? (
                <Image
                  src={userProfile.avatarUrl}
                  alt={userProfile.fullName}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">
                  {(userProfile.fullName || userProfile.email || 'U').charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-slate-900 dark:text-white truncate">
                  {userProfile.fullName || 'User'}
                </p>
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              </div>
              <p className="text-xs font-mono text-primary font-medium truncate">
                @{currentUsername}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {userProfile.email}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Direct Friend Add
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-200/60 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-200">
              <QrCode className="w-3 h-3 text-slate-500" />
              splitest.thenicedev.xyz/u/{currentUsername}
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Your Profile Link
          </label>
          <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate flex-1 select-all">
              {profileUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-primary text-white hover:bg-primary-hover shadow-sm"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <Share2 className="w-4 h-4 text-primary" />
            Share Profile
          </button>

          <a
            href={`/u/${currentUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            Preview Card
          </a>
        </div>
      </div>
    </div>
  );
}
