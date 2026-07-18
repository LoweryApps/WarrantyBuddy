"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AuthInput } from "@/components/auth/auth-input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 text-teal">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="h-7 w-7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h1 className="font-display text-lg font-bold text-navy">Check your email</h1>
          <p className="mt-1 text-xs leading-relaxed text-ink">
            If an account exists for <strong className="text-navy">{email}</strong>,
            we&apos;ve sent a link to reset your password. Check your spam folder if
            it doesn&apos;t arrive.
          </p>
          <p className="mt-5 border-t border-border pt-4 text-xs">
            <Link href="/login" className="text-ink">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="text-center">
        <h1 className="font-display text-lg font-bold text-navy">
          Forgot your password?
        </h1>
        <p className="mb-5 text-xs leading-relaxed text-ink">
          Enter your email and we&apos;ll send you a reset link. Check your spam
          folder if it doesn&apos;t arrive.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error ? (
          <Alert className="border-red/30 bg-red/5 text-red">
            <AlertDescription className="text-red">{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-1.5 text-left">
          <Label htmlFor="email" className="text-xs font-medium text-ink">
            Email address
          </Label>
          <AuthInput
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@example.com"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-teal font-semibold text-navy hover:bg-teal/90"
        >
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs">
        <Link href="/login" className="text-ink">
          ← Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
