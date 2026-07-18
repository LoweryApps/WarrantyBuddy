"use client";

import { useState } from "react";
import { ChevronRight, User } from "lucide-react";
import { AuthInput } from "@/components/auth/auth-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { SettingsSection } from "@/components/settings/section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";

export function AccountSection({ fullName, email }: { fullName: string | null; email: string }) {
  const [changingPassword, setChangingPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function handleChangePassword() {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords don't match.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setChangingPassword(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <SettingsSection icon={User} title="Account" subtitle="Your login and profile">
      <div className="flex items-center gap-3 border-b border-border p-3.5">
        <Avatar size="lg">
          <AvatarFallback className="bg-navy font-medium text-teal">
            {initials(fullName, email)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-medium text-foreground">{fullName || "—"}</div>
          <div className="text-[11px] text-ink">{email}</div>
        </div>
      </div>

      {success ? (
        <div className="border-b border-border p-3.5">
          <Alert className="border-teal/30 bg-teal/5 text-teal">
            <AlertDescription className="text-teal">Password updated.</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {!changingPassword ? (
        <button
          type="button"
          onClick={() => setChangingPassword(true)}
          className="flex w-full items-center gap-3 p-3.5 text-left"
        >
          <div className="flex-1 text-xs text-foreground">Change password</div>
          <ChevronRight className="h-4 w-4 text-ink" />
        </button>
      ) : (
        <div className="space-y-3 p-3.5">
          {error ? (
            <Alert className="border-red/30 bg-red/5 text-red">
              <AlertDescription className="text-red">{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink">New password</label>
            <AuthInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
            <PasswordStrength password={password} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink">Confirm new password</label>
            <AuthInput
              type="password"
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setChangingPassword(false);
                setError(null);
                setPassword("");
                setConfirmPassword("");
              }}
              className="h-9 flex-1 rounded-lg border-border text-foreground hover:bg-cloud"
            >
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={handleChangePassword}
              className="h-9 flex-1 rounded-lg bg-teal font-medium text-navy hover:bg-teal/90"
            >
              {saving ? "Saving…" : "Save password"}
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}

