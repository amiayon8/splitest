"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const establishSession = () => {
    document.cookie = `splitest_session=authenticated; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    router.push(nextPath);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    const supabase = getSupabaseClient();
    if (!supabase) {
      establishSession();
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
      }
    } catch {
      establishSession();
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setErrorMsg("");

    const supabase = getSupabaseClient();
    if (!supabase) {
      establishSession();
      return;
    }

    try {
      if (password) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setErrorMsg(error.message);
          setIsLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (error) {
          setErrorMsg(error.message);
          setIsLoading(false);
          return;
        }
      }
      establishSession();
    } catch {
      establishSession();
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/Splitest.svg"
            alt="Splitest"
            className="w-16 h-16 object-contain mb-4 shadow-sm"
          />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Splitest
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Shared expense and debt resolution
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-12 rounded-full border border-slate-300 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center my-6 gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs uppercase font-medium text-slate-400 tracking-wider">
              or email
            </span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full h-11 px-4 pl-10 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password (optional for magic link)
                </label>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for magic link"
                  className="w-full h-11 px-4 pl-10 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={establishSession}
              className="w-full h-10 rounded-full bg-[#F1F5F9] hover:bg-slate-200/80 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              Quick Preview (Demo Session)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <LoginForm />
    </Suspense>
  );
}
