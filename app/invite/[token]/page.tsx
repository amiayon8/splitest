"use client";

import React, { use, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSplitest } from "@/lib/store";
import { getSupabaseClient } from "@/lib/supabase";
import { Group } from "@/types";
import {
  Users,
  CheckCircle2,
  Shield,
  ArrowRight,
  LogIn,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

function InviteContent({ params }: InvitePageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userProfile, joinGroup, setActiveGroupId, groups } = useSplitest();

  const token = resolvedParams.token;
  const roleParam = searchParams.get("role") as "editor" | "viewer" | null;

  const [isLoading, setIsLoading] = useState(true);
  const [targetGroup, setTargetGroup] = useState<Group | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAuthenticated = !!(userProfile.id || userProfile.email);

  useEffect(() => {
    let isCancelled = false;

    async function resolveInvite() {
      setIsLoading(true);
      setErrorMessage(null);

      const client = getSupabaseClient();
      if (!client) {
        setIsLoading(false);
        setErrorMessage("Database connection unavailable");
        return;
      }

      try {
        let matchedGroupId: string | null = null;
        let matchedRole: "editor" | "viewer" = roleParam || (token.includes("view") ? "viewer" : "editor");

        const { data: inviteRecord } = await client
          .from("group_invites")
          .select("*")
          .eq("id", token)
          .maybeSingle();

        if (inviteRecord) {
          matchedGroupId = inviteRecord.group_id;
          if (inviteRecord.role) {
            matchedRole = inviteRecord.role;
          }
        }

        if (!matchedGroupId) {
          const { data: directGroup } = await client
            .from("groups")
            .select("*")
            .eq("id", token)
            .maybeSingle();

          if (directGroup) {
            matchedGroupId = directGroup.id;
          }
        }

        if (!matchedGroupId && token.startsWith("invite-")) {
          const withoutPrefix = token.replace(/^invite-/, "");
          const candidateId = withoutPrefix.replace(/-(access|[a-z0-9]+)$/, "");

          const { data: candidateGroup } = await client
            .from("groups")
            .select("*")
            .eq("id", candidateId)
            .maybeSingle();

          if (candidateGroup) {
            matchedGroupId = candidateGroup.id;
          } else {
            const { data: byRawPrefix } = await client
              .from("groups")
              .select("*")
              .eq("id", withoutPrefix)
              .maybeSingle();
            if (byRawPrefix) {
              matchedGroupId = byRawPrefix.id;
            }
          }
        }

        if (!matchedGroupId) {
          if (!isCancelled) {
            setIsLoading(false);
            setErrorMessage("This invite link is invalid or has expired.");
          }
          return;
        }

        const [groupRes, membersRes] = await Promise.all([
          client.from("groups").select("*").eq("id", matchedGroupId).maybeSingle(),
          client.from("group_members").select("*").eq("group_id", matchedGroupId),
        ]);

        if (isCancelled) return;

        if (!groupRes.data) {
          setIsLoading(false);
          setErrorMessage("Group no longer exists.");
          return;
        }

        const fetchedMembers = membersRes.data || [];
        const built: Group = {
          id: groupRes.data.id,
          name: groupRes.data.name,
          icon: groupRes.data.icon || "Users",
          category: groupRes.data.category || "Trip",
          description: groupRes.data.description || "Shared expense group",
          defaultCurrency: groupRes.data.default_currency || "USD",
          simplifyDebts: groupRes.data.simplify_debts ?? true,
          userRole: matchedRole,
          createdAt: groupRes.data.created_at,
          members: fetchedMembers.map((m) => ({
            id: m.id,
            groupId: m.group_id,
            name: m.name,
            email: m.email,
            avatarUrl: m.avatar_url || "",
            role: m.role || "editor",
            isCurrentUser: false,
          })),
        };

        setTargetGroup(built);
        setMemberCount(fetchedMembers.length);
        setInviteRole(matchedRole);
        setIsLoading(false);
      } catch {
        if (!isCancelled) {
          setIsLoading(false);
          setErrorMessage("Failed to load invite. Please try again.");
        }
      }
    }

    void resolveInvite();

    return () => {
      isCancelled = true;
    };
  }, [token, roleParam]);

  const isAlreadyMember = React.useMemo(() => {
    if (!targetGroup) return false;
    const localExisting = groups.some((g) => g.id === targetGroup.id);
    if (localExisting) return true;

    const email = (userProfile.email || "").trim().toLowerCase();
    const name = (userProfile.fullName || "").trim().toLowerCase();
    const handle = (userProfile.username || "").trim().toLowerCase();

    return targetGroup.members.some((m) => {
      if (userProfile.id && (m as { user_id?: string }).user_id === userProfile.id) return true;
      if (email && m.email && m.email.trim().toLowerCase() === email) return true;
      const mName = m.name.trim().toLowerCase();
      if (name && mName === name) return true;
      if (handle && mName === handle) return true;
      return false;
    });
  }, [targetGroup, groups, userProfile]);

  const handleJoin = async () => {
    if (!targetGroup) return;
    setIsJoining(true);
    const res = await joinGroup(targetGroup.id, inviteRole);
    setIsJoining(false);
    if (res.success) {
      router.push("/");
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleOpenExisting = () => {
    if (targetGroup) {
      setActiveGroupId(targetGroup.id);
    }
    router.push("/");
  };

  const handleLoginRedirect = () => {
    const nextPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/invite/${token}`;
    router.push(`/login?next=${encodeURIComponent(nextPath)}`);
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col justify-center items-center px-4 py-12 select-none transition-colors">
      <div className="flex items-center gap-2 mb-6">
        <img
          src="/Splitest.svg"
          alt="Splitest"
          className="w-8 h-8 object-contain shadow-xs"
        />
        <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Splitest
        </span>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-sm transition-colors">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Verifying group invite link...
            </p>
          </div>
        ) : errorMessage || !targetGroup ? (
          <div className="py-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-[#E11D48] flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Invite Unavailable
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                {errorMessage || "The group invite you requested could not be found."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-2 px-6 py-2.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              Back to Splitest
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center font-bold text-xl">
                {targetGroup.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  {targetGroup.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {targetGroup.description || "Shared expense group"}
                </p>
              </div>
            </div>

            <div className="bg-[#F8FAFC] dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800 mb-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  Access Level
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200/70 dark:border-slate-700">
                  {inviteRole === "viewer" ? "Viewer (View Only)" : "Editor (Can Add & Edit)"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Current Members
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {memberCount} {memberCount === 1 ? "person" : "people"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {!isAuthenticated ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleLoginRedirect}
                    className="w-full h-12 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Log In to Join Group</span>
                  </button>
                  <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                    Sign in with Google or email to accept this group invite
                  </p>
                </div>
              ) : isAlreadyMember ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-[#D1FAE5] dark:bg-[#064E3B]/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2 text-xs font-semibold text-[#065F46] dark:text-[#A7F3D0]">
                    <Check className="w-4 h-4" />
                    <span>You are already a member of this group</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenExisting}
                    className="w-full h-12 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                  >
                    <span>Open Group</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="w-full h-12 rounded-full bg-[#059669] hover:bg-[#047857] disabled:opacity-60 disabled:pointer-events-none text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                  >
                    {isJoining ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>{isJoining ? "Joining Group..." : "Accept Invitation & Join"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="w-full h-11 rounded-full bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all active:scale-[0.98]"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>Instant real-time sync with group balances</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function InvitePage(props: InvitePageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16]" />}>
      <InviteContent {...props} />
    </Suspense>
  );
}
