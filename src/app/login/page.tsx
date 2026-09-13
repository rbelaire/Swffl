"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/predict";

  const [mode, setMode] = useState<"in" | "up">("in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase isn't configured yet.");
      setLoading(false);
      return;
    }

    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName || email.split("@")[0] } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (!data.session) {
        setNotice("Account created! Check your email to confirm, then sign in.");
        setMode("in");
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }
    router.push(redirect);
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-navy px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo-white.png" alt="So Whopped FFL" width={48} height={72} className="h-14 w-auto" />
          <h1 className="mt-5 font-display text-2xl font-700 text-white">
            {mode === "in" ? "Member Sign In" : "Join the Pool"}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {mode === "in" ? "Sign in to make your NFL picks." : "Create an account to play."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {notice && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
          )}

          {mode === "up" && (
            <div className="mb-4">
              <label className="label" htmlFor="dn">Display name</label>
              <input id="dn" type="text" className="field" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)} placeholder="How you'll show on the leaderboard" />
            </div>
          )}

          <div className="mb-4">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" className="field" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          <div className="mb-6">
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" required autoComplete={mode === "in" ? "current-password" : "new-password"}
              className="field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
          </button>

          <p className="mt-4 text-center text-sm text-navy-900/60">
            {mode === "in" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); setNotice(null); }}
              className="font-semibold text-navy-700 hover:text-navy-900"
            >
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          <Link href="/" className="hover:text-white">← Back to the site</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] bg-navy" />}>
      <LoginForm />
    </Suspense>
  );
}
