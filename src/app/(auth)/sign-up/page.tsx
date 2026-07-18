"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthInput } from "@/components/auth/auth-input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/lib/auth-error";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);

    if (error) {
      setError(authErrorMessage(error));
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthCard>
      <h1 className="font-display text-lg font-bold text-navy">
        Create your account
      </h1>
      <p className="mb-5 text-xs text-ink">Free to start. No credit card needed.</p>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error ? (
          <Alert className="border-red/30 bg-red/5 text-red">
            <AlertDescription className="text-red">{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-xs font-medium text-ink">
            Full name
          </Label>
          <AuthInput
            id="fullName"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Johnson"
          />
        </div>

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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />
          <PasswordStrength password={password} />
        </div>

        <div className="flex items-start gap-2.5 pt-1">
          <Checkbox
            id="agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked)}
            className="mt-0.5 border-border data-checked:border-teal data-checked:bg-teal data-checked:text-navy"
          />
          <Label htmlFor="agree" className="text-[11px] font-normal leading-relaxed text-ink">
            I agree to the <span className="text-teal">Terms of Service</span> and{" "}
            <span className="text-teal">Privacy Policy</span>
          </Label>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-1 h-12 w-full rounded-xl bg-teal font-semibold text-navy hover:bg-teal/90"
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-ink">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-teal">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
