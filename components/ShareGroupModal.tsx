"use client";

import React, { useState } from "react";
import { useSplitest } from "@/lib/store";
import {
  X,
  Copy,
  Check,
  Mail,
  Link as LinkIcon,
  Shield,
  RotateCw,
  UserCheck,
  ChevronDown,
} from "lucide-react";

interface ShareGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareGroupModal({ isOpen, onClose }: ShareGroupModalProps) {
  const { activeGroup, showToast } = useSplitest();

  const [emailInput, setEmailInput] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [generalAccessRole, setGeneralAccessRole] = useState<
    "editor" | "viewer"
  >("viewer");
  const [copiedLink, setCopiedLink] = useState(false);
  const [customToken, setCustomToken] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const linkToken = customToken || `invite-${activeGroup.id}-access`;

  if (!isOpen) return null;

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${linkToken}?role=${generalAccessRole}`
      : `https://splitest.thenicedev.xyz/invite/${linkToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    showToast("Invite link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleResetLink = () => {
    const newToken = `invite-${activeGroup.id}-${Date.now().toString(36)}`;
    setCustomToken(newToken);
    showToast("New invite link generated");
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      showToast(
        `Invitation sent to ${emailInput} (${inviteRole === "editor" ? "Can edit" : "Can view"})`,
      );
      setEmailInput("");
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Share &quot;{activeGroup.name}&quot;
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage member access and sharing link
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto thin-scrollbar">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Invite by email
            </label>
            <form onSubmit={handleSendInvite} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full h-11 px-4 pl-10 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
                />
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              </div>

              <div className="relative">
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "editor" | "viewer")
                  }
                  aria-label="Select invite permission"
                  className="h-11 px-3.5 pr-8 rounded-2xl bg-[#F1F5F9] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981]"
                >
                  <option
                    value="editor"
                    className="dark:bg-[#1E293B] dark:text-slate-200"
                  >
                    Can edit
                  </option>
                  <option
                    value="viewer"
                    className="dark:bg-[#1E293B] dark:text-slate-200"
                  >
                    Can view
                  </option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
              </div>

              <button
                type="submit"
                disabled={isSending || !emailInput.trim()}
                className="h-11 px-5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold flex items-center justify-center transition-all disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-[#1E293B]/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#D1FAE5] dark:bg-[#064E3B]/50 text-[#065F46] dark:text-[#A7F3D0] flex items-center justify-center">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    General access
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Anyone with this link
                  </p>
                </div>
              </div>

              <div className="relative">
                <select
                  value={generalAccessRole}
                  onChange={(e) =>
                    setGeneralAccessRole(e.target.value as "editor" | "viewer")
                  }
                  aria-label="Select general access permission"
                  className="h-8 px-3 pr-7 rounded-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none"
                >
                  <option
                    value="viewer"
                    className="dark:bg-[#0F172A] dark:text-slate-200"
                  >
                    Can view
                  </option>
                  <option
                    value="editor"
                    className="dark:bg-[#0F172A] dark:text-slate-200"
                  >
                    Can edit
                  </option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 px-3 py-2 bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 truncate font-mono text-[11px]">
                {inviteUrl}
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="h-9 px-4 rounded-full bg-[#059669] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#047857] transition-all shrink-0 active:scale-95"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedLink ? "Copied" : "Copy"}
              </button>

              <button
                type="button"
                onClick={handleResetLink}
                title="Reset link"
                className="w-9 h-9 rounded-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Group Members ({activeGroup.members.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto thin-scrollbar pr-1">
              {activeGroup.members.map((member) => (
                <div
                  key={member.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {member.name}
                        </span>
                        {member.isCurrentUser && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {member.email ||
                          `${member.name.toLowerCase().replace(" ", ".")}@example.com`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {member.role === "owner" ? (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3 text-[#059669] dark:text-[#34D399]" />
                        Owner
                      </span>
                    ) : (
                      <select
                        defaultValue={member.role}
                        aria-label={`Select role for ${member.name}`}
                        className="h-8 px-2.5 pr-6 rounded-full bg-[#F1F5F9] dark:bg-[#1E293B] border border-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
                      >
                        <option
                          value="editor"
                          className="dark:bg-[#1E293B] dark:text-slate-200"
                        >
                          Editor
                        </option>
                        <option
                          value="viewer"
                          className="dark:bg-[#1E293B] dark:text-slate-200"
                        >
                          Viewer
                        </option>
                        <option
                          value="remove"
                          className="dark:bg-[#1E293B] dark:text-slate-200"
                        >
                          Remove
                        </option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-[#F8FAFC] dark:bg-[#0F172A] border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
