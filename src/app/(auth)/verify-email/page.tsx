"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { OtpInput } from "@/components/auth/otp-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function handleVerify() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      setError(error.message);
      return;
    }
    setResent(true);
  }

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
          We sent a 6-digit code to
          <br />
          <strong className="text-navy">{email || "your email address"}</strong>
        </p>

        {error ? (
          <Alert className="mt-4 border-red/30 bg-red/5 text-left text-red">
            <AlertDescription className="text-red">{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="my-5">
          <OtpInput value={code} onChange={setCode} disabled={loading} />
        </div>

        <Button
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          className="h-12 w-full rounded-xl bg-teal font-semibold text-navy hover:bg-teal/90"
        >
          {loading ? "Verifying…" : "Verify email"}
        </Button>

        <p className="mt-4 text-xs text-ink">
          {resent ? (
            <span className="text-teal">Code resent — check your inbox.</span>
          ) : (
            <>
              Didn&apos;t get it?{" "}
              <button
                type="button"
                onClick={handleResend}
                className="font-medium text-teal"
              >
                Resend code
              </button>
            </>
          )}
        </p>

        <p className="mt-3 border-t border-border pt-3 text-xs">
          <Link href="/sign-up" className="text-ink">
            ← Back to sign up
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
