"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { SettingsRow, SettingsSection } from "@/components/settings/section";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";

export function NotificationsSection({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function handleToggle(checked: boolean) {
    setEnabled(checked);
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("users").update({ notification_email: checked }).eq("id", user.id);
    }
    setSaving(false);
  }

  return (
    <SettingsSection
      icon={Bell}
      iconTone="amber"
      title="Notifications"
      subtitle="Choose what Buddy alerts you about"
    >
      <SettingsRow
        label="Email alerts"
        sublabel="Recall matches and warranty expirations (60 days out)"
      >
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={saving}
          className="data-checked:bg-teal"
        />
      </SettingsRow>
    </SettingsSection>
  );
}
