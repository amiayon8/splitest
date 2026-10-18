"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { ArrowRight, Lock, Mail, User, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const establishSession = () => {
    document.cookie = `splitest_session=authenticated; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    router.push(nextPath);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const supabase = getSupabaseClient();
    if (!supabase) {
      establishSession();
      return;
    }

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split("@")[0],
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (error) {
          setErrorMsg(error.message);
          setIsLoading(false);
          return;
        }

        if (data.session) {
          establishSession();
        } else {
          setSuccessMsg("Account created! Please check your email to confirm your sign up.");
          setIsLoading(false);
        }
      } else {
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
      }
    } catch {
      establishSession();
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/Splitest.svg"
            alt="Splitest"
            className="w-16 h-16 object-contain mb-4 shadow-sm"
          />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Splitest
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Shared expense and debt resolution
          </p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-sm">
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                authMode === "signin"
                  ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                authMode === "signup"
                  ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Sign Up
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-12 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm"
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
            <span>
              {authMode === "signup" ? "Sign up with Google" : "Continue with Google"}
            </span>
          </button>

          <div className="flex items-center my-6 gap-3">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
            <span className="text-xs uppercase font-medium text-slate-400 dark:text-slate-500 tracking-wider">
              or email
            </span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Rivera"
                    required={authMode === "signup"}
                    className="w-full h-11 px-4 pl-10 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981] focus:ring-1 focus:ring-[#059669]"
                  />
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full h-11 px-4 pl-10 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981] focus:ring-1 focus:ring-[#059669]"
                />
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {authMode === "signup" ? "Password" : "Password (optional for magic link)"}
                </label>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === "signup" ? "Create a secure password" : "Leave empty for magic link"}
                  required={authMode === "signup"}
                  minLength={authMode === "signup" ? 6 : undefined}
                  className="w-full h-11 px-4 pl-10 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981] focus:ring-1 focus:ring-[#059669]"
                />
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-2.5 rounded-xl">
                {errorMsg}
              </p>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
            >
              {authMode === "signup" ? "Create Account" : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            {authMode === "signin" ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="font-bold text-[#059669] dark:text-[#34D399] hover:underline"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signin");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="font-bold text-[#059669] dark:text-[#34D399] hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16]" />}
    >
      <LoginForm />
    </Suspense>
  );
}
