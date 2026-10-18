"use client";

import React, { use, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSplitest } from "@/lib/store";
import { Users, CheckCircle2, Shield, ArrowRight } from "lucide-react";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

function InviteContent({ params }: InvitePageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { groups, currentGroup } = useSplitest();

  const group = groups.find((g) => g.id === currentGroup.id) || currentGroup;
  const isViewer = resolvedParams.token.includes("view");
  const roleName = isViewer ? "Viewer (View Only)" : "Editor (Can Edit)";

  const handleAccept = () => {
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="flex items-center gap-2 mb-6">
        <img
          src="/Splitest.svg"
          alt="Splitest"
          className="w-8 h-8 object-contain shadow-xs"
        />
        <span className="text-xl font-bold text-slate-900 tracking-tight">
          Splitest
        </span>
      </div>
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-[#065F46] flex items-center justify-center font-bold text-xl">
            {group.name.slice(0, 1)}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{group.name}</h1>
            <p className="text-xs text-slate-500">Shared expense group</p>
          </div>
        </div>

        <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-slate-200/60 mb-6 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              Access Level
            </span>
            <span className="font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-full border border-slate-200/70">
              {roleName}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Current Members
            </span>
            <span className="font-medium text-slate-700">
              {group.members.length} people
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleAccept}
            className="w-full h-12 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
          >
            Accept Invitation & Join
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full h-11 rounded-full bg-[#F1F5F9] hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-all active:scale-[0.98]"
          >
            Decline
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
          <span>Instant real-time sync with group balances</span>
        </div>
      </div>
    </main>
  );
}

export default function InvitePage(props: InvitePageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <InviteContent {...props} />
    </Suspense>
  );
}
