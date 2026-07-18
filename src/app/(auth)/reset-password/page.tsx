"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AuthInput } from "@/components/auth/auth-input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/lib/auth-error";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setCheckingSession(false);
    });
  }, [supabase]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(authErrorMessage(error));
      return;
    }

    router.push("/login");
  }

  if (checkingSession) {
    return <AuthCard>{null}</AuthCard>;
  }

  if (!hasSession) {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="font-display text-lg font-bold text-navy">
            Link expired
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-ink">
            This password reset link is invalid or has expired. Request a new
            one to continue.
          </p>
          <Link href="/forgot-password">
            <Button className="mt-5 h-12 w-full rounded-xl bg-teal font-semibold text-navy hover:bg-teal/90">
              Request new link
            </Button>
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 text-teal">
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
              d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>
        <h1 className="font-display text-lg font-bold text-navy">
          Set a new password
        </h1>
        <p className="mb-5 text-xs text-ink">Must be at least 8 characters.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
        {error ? (
          <Alert className="border-red/30 bg-red/5 text-red">
            <AlertDescription className="text-red">{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-ink">
            New password
          </Label>
          <AuthInput
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-ink">
            Confirm new password
          </Label>
          <AuthInput
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••••"
          />
          {confirmPassword ? (
            <p className={passwordsMatch ? "text-[10px] text-teal" : "text-[10px] text-red"}>
              {passwordsMatch ? "Passwords match" : "Passwords don't match"}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-1 h-12 w-full rounded-xl bg-teal font-semibold text-navy hover:bg-teal/90"
        >
          {loading ? "Updating…" : "Update password"}
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
