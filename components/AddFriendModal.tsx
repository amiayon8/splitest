'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSplitest } from '@/lib/store';
import {
  findUserByUsername,
  normalizeUsernameInput,
  PRESET_USERS_DIRECTORY,
  PublicUserProfile,
} from '@/lib/users-directory';
import {
  X,
  UserPlus,
  Search,
  Check,
  Link as LinkIcon,
  Sparkles,
  Users,
  MapPin,
  Share2,
} from 'lucide-react';

export function AddFriendModal() {
  const {
    isAddFriendModalOpen,
    setIsAddFriendModalOpen,
    allFriendsList,
    addFriendDirectly,
    addFriendByUsername,
    setIsShareProfileModalOpen,
    showToast,
  } = useSplitest();

  const [inputQuery, setInputQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  if (!isAddFriendModalOpen) return null;

  const normalizedInput = normalizeUsernameInput(inputQuery);
  const matchedUser: PublicUserProfile | null = normalizedInput ? findUserByUsername(normalizedInput) : null;

  const isAlreadyFriend = (username: string) => {
    return allFriendsList.some((item) => item.username.toLowerCase() === username.toLowerCase());
  };

  const handleAddMatched = () => {
    if (!inputQuery.trim()) return;
    const result = addFriendByUsername(inputQuery);
    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message });
      setInputQuery('');
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddMatched();
    }
  };

  const handleQuickAdd = (user: PublicUserProfile) => {
    addFriendDirectly(user);
    setStatusMessage({ type: 'success', text: `Added @${user.username} to your friends list!` });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={() => setIsAddFriendModalOpen(false)}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Friends</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Search by username or paste a profile link</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAddFriendModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => {
                setInputQuery(e.target.value);
                setStatusMessage(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter username (e.g. alex.rivera) or paste /u/ link..."
              className="w-full pl-10 pr-24 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-slate-900 dark:text-white placeholder:text-slate-400"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddMatched}
              disabled={!inputQuery.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {statusMessage && (
            <div
              className={`mt-2.5 px-3 py-2 rounded-xl text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
              }`}
            >
              {statusMessage.text}
            </div>
          )}
        </div>

        {matchedUser && (
          <div className="mb-4 p-3.5 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex-shrink-0 animate-scale-in">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-11 h-11 rounded-full overflow-hidden border border-primary/30 flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                  {matchedUser.avatarUrl ? (
                    <Image
                      src={matchedUser.avatarUrl}
                      alt={matchedUser.name}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-primary">
                      {matchedUser.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {matchedUser.name}
                  </p>
                  <p className="text-xs font-mono text-primary truncate">
                    @{matchedUser.username}
                  </p>
                  {matchedUser.bio && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {matchedUser.bio}
                    </p>
                  )}
                </div>
              </div>

              <div>
                {isAlreadyFriend(matchedUser.username) ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    Friends
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(matchedUser)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Friend
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Suggested Contacts
            </h4>
            <span className="text-[11px] text-slate-400">Splitest Directory</span>
          </div>

          <div className="space-y-2">
            {PRESET_USERS_DIRECTORY.map((user) => {
              const alreadyAdded = isAlreadyFriend(user.username);
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.name}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-medium text-slate-700 dark:text-slate-300 text-xs">
                          {user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                        @{user.username}
                      </p>
                    </div>
                  </div>

                  <div>
                    {alreadyAdded ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 px-2 py-1">
                        <Check className="w-3 h-3" />
                        Added
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(user)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-primary hover:text-primary text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                      >
                        <UserPlus className="w-3 h-3" />
                        Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <LinkIcon className="w-3.5 h-3.5" />
            Share links format: /u/username
          </span>
          <button
            type="button"
            onClick={() => {
              setIsAddFriendModalOpen(false);
              setIsShareProfileModalOpen(true);
            }}
            className="text-primary hover:underline font-semibold flex items-center gap-1"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Your Link
          </button>
        </div>
      </div>
    </div>
  );
}
