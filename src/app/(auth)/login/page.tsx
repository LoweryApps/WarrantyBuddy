"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AuthInput } from "@/components/auth/auth-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/lib/auth-error";
import { createClient } from "@/lib/supabase/client";
import { forgetSessionOnBrowserClose } from "@/lib/supabase/session-persistence";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "invalid-link"
      ? "That link is invalid or has expired. Please try again."
      : null,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError(authErrorMessage(error));
      return;
    }

    if (!rememberMe) {
      forgetSessionOnBrowserClose();
    }

    router.push("/dashboard");
  }

  return (
    <AuthCard tagline="Welcome back">
      <h1 className="font-display text-lg font-bold text-navy">Sign in</h1>
      <p className="mb-5 text-xs text-ink">
        Enter your email and password to continue.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error ? (
          <Alert className="border-red/30 bg-red/5 text-red">
            <AlertDescription className="text-red">{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-1.5">
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

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-ink">
            Password
          </Label>
          <AuthInput
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />
        </div>

        <div className="!mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="border-border data-checked:border-teal data-checked:bg-teal data-checked:text-navy"
            />
            <Label htmlFor="rememberMe" className="text-[11px] font-normal text-ink">
              Remember me
            </Label>
          </div>
          <Link href="/forgot-password" className="text-[11px] font-medium text-teal">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-navy font-semibold text-white hover:bg-navy/90"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-ink">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-teal">
          Sign up free
        </Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
