"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSplitest } from "@/lib/store";
import {
  findUserByUsername,
  fetchUserProfileFromDatabase,
  buildProfileShareUrl,
  PublicUserProfile,
} from "@/lib/users-directory";
import {
  UserPlus,
  Check,
  Copy,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Calendar,
  Share2,
} from "lucide-react";

interface ProfileClientProps {
  username: string;
}

export default function ProfileClient({ username }: ProfileClientProps) {
  const router = useRouter();
  const {
    userProfile,
    allFriendsList,
    addFriendDirectly,
    setCurrentView,
    showToast,
  } = useSplitest();

  const [copiedLink, setCopiedLink] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [targetUser, setTargetUser] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      setIsLoading(true);
      const localMatch = findUserByUsername(username, allFriendsList);
      if (localMatch) {
        if (active) {
          setTargetUser(localMatch);
          setIsLoading(false);
        }
        return;
      }
      const fetched = await fetchUserProfileFromDatabase(username);
      if (active) {
        setTargetUser(fetched);
        setIsLoading(false);
      }
    }
    void loadUser();
    return () => {
      active = false;
    };
  }, [username, allFriendsList]);

  const isSelf = useMemo(() => {
    if (!targetUser) return false;
    const currentHandle = userProfile.username || userProfile.paymentHandle || "";
    return (
      (currentHandle && targetUser.username.toLowerCase() === currentHandle.toLowerCase()) ||
      (userProfile.email && targetUser.email.toLowerCase() === userProfile.email.toLowerCase())
    );
  }, [targetUser, userProfile]);

  const isAlreadyFriend = useMemo(() => {
    if (!targetUser) return false;
    return allFriendsList.some(
      (f) =>
        f.name.toLowerCase() === targetUser.name.toLowerCase() ||
        f.username?.toLowerCase() === targetUser.username.toLowerCase()
    );
  }, [targetUser, allFriendsList]);

  const profileUrl = useMemo(() => {
    return buildProfileShareUrl(username);
  }, [username]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedLink(true);
      showToast("Profile link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast("Could not copy link");
    }
  };

  const handleAddFriend = () => {
    if (!targetUser) return;
    setIsAdding(true);
    addFriendDirectly({
      id: targetUser.id,
      name: targetUser.name,
      username: targetUser.username,
      email: targetUser.email,
      avatarUrl: targetUser.avatarUrl,
      addedVia: "link",
    });
    setIsAdding(false);
    setAddedSuccess(true);
  };

  const handleStartChat = () => {
    setCurrentView("chat");
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex items-center justify-center p-6 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col items-center justify-center p-6 text-center select-none transition-colors">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <img
            src="/Splitest.svg"
            alt="Splitest"
            className="w-10 h-10 object-contain"
          />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Profile Not Found
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          The user @{username} could not be located on Splitest. Check the username or link and try again.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="px-6 h-11 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-all shadow-sm"
        >
          Go to Splitest Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col items-center justify-center p-4 sm:p-6 select-none transition-colors">
      <header className="mb-6 flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/")}>
        <img
          src="/Splitest.svg"
          alt="Splitest"
          className="w-9 h-9 object-contain shadow-xs"
        />
        <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Splitest
        </span>
      </header>

      <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden animate-scale-in">
        <div className="h-28 bg-linear-to-r from-emerald-600 to-teal-500 relative">
          <button
            type="button"
            onClick={handleCopyLink}
            className="absolute top-3 right-3 h-8 px-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Share Profile Link"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span>{copiedLink ? "Copied" : "Share"}</span>
          </button>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <div className="relative">
              {targetUser.avatarUrl ? (
                <img
                  src={targetUser.avatarUrl}
                  alt={targetUser.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-[#0F172A] shadow-md bg-slate-100 dark:bg-slate-800"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-3xl uppercase border-4 border-white dark:border-[#0F172A] shadow-md">
                  {targetUser.name.charAt(0)}
                </div>
              )}
              <div className="w-4 h-4 rounded-full bg-[#10B981] border-2 border-white dark:border-[#0F172A] absolute bottom-1 right-1" />
            </div>

            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Ledger</span>
            </div>
          </div>

          <div className="space-y-1 mb-4">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {targetUser.name}
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              @{targetUser.username} {targetUser.email ? `• ${targetUser.email}` : ''}
            </p>
          </div>

          {targetUser.bio && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              {targetUser.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-3 py-3 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 mb-6">
            {targetUser.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{targetUser.location}</span>
              </div>
            )}
            {targetUser.memberSince && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{targetUser.memberSince}</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            {isSelf ? (
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                This is your public profile link
              </div>
            ) : isAlreadyFriend || addedSuccess ? (
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B]/50 border border-emerald-200 dark:border-emerald-800 text-center text-xs font-bold text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Connected as Friend on Splitest</span>
                </div>

                <button
                  type="button"
                  onClick={handleStartChat}
                  className="w-full h-11 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Direct Message</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isAdding}
                onClick={handleAddFriend}
                className="w-full h-12 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>{isAdding ? "Adding..." : `Add ${targetUser.name} as Friend`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full h-10 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Profile Sharing Link</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
