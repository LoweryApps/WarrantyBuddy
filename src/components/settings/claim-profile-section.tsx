"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail } from "lucide-react";
import { AuthInput } from "@/components/auth/auth-input";
import { SettingsSection } from "@/components/settings/section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function ClaimProfileSection({
  fullName: initialFullName,
  phone: initialPhone,
  claimEmail: initialClaimEmail,
}: {
  fullName: string | null;
  phone: string | null;
  claimEmail: string | null;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [claimEmail, setClaimEmail] = useState(initialClaimEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dirty =
    fullName !== (initialFullName ?? "") ||
    phone !== (initialPhone ?? "") ||
    claimEmail !== (initialClaimEmail ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session expired — please sign in again.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        claim_email: claimEmail.trim() || null,
      })
      .eq("id", user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    router.refresh();
  }

  function handleCancel() {
    setFullName(initialFullName ?? "");
    setPhone(initialPhone ?? "");
    setClaimEmail(initialClaimEmail ?? "");
    setError(null);
  }

  return (
    <SettingsSection
      icon={Mail}
      iconTone="teal"
      title="Profile for claim emails"
      subtitle="Buddy uses these to auto-fill your email signature"
    >
      <div className="space-y-3 p-3.5">
        {error ? (
          <Alert className="border-red/30 bg-red/5 text-red">
            <AlertDescription className="text-red">{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert className="border-teal/30 bg-teal/5 text-teal">
            <AlertDescription className="text-teal">
              Profile saved — Buddy will use this for claim emails.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-ink">Full name</Label>
          <AuthInput value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-ink">Phone number</Label>
          <AuthInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 214-8832"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-ink">Claim email address</Label>
          <AuthInput
            type="email"
            value={claimEmail}
            onChange={(e) => setClaimEmail(e.target.value)}
            placeholder="alex@example.com"
          />
        </div>

        {dirty ? (
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="h-9 flex-1 rounded-lg border-border text-foreground hover:bg-cloud"
            >
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={handleSave}
              className="h-9 flex-1 rounded-lg bg-teal font-medium text-navy hover:bg-teal/90"
            >
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        ) : null}
      </div>
    </SettingsSection>
  );
}
