"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function DeleteAccountSection() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const res = await fetch("/api/account/delete", { method: "POST" });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't delete your account. Please try again.");
      setDeleting(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button
        onClick={() => setConfirming(true)}
        variant="outline"
        className="h-10 w-full rounded-lg border-red/40 bg-white text-red hover:bg-red/5"
      >
        Delete my account
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-red/40 bg-red/5 p-3.5">
      <div className="mb-1 text-xs font-medium text-red">
        Are you sure you want to delete your account?
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-red/80">
        This will permanently delete all your products, warranties, documents,
        and receipts. This cannot be undone.
      </p>

      {error ? <p className="mb-2 text-[11px] text-red">{error}</p> : null}

      <label className="mb-1 block text-[11px] font-medium text-red/80">
        Type DELETE to confirm
      </label>
      <AuthInput
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="DELETE"
        className="mb-3 border-red/30 bg-white"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setConfirming(false);
            setConfirmText("");
            setError(null);
          }}
          className="h-9 flex-1 rounded-lg border-border bg-white text-foreground hover:bg-cloud"
        >
          Cancel
        </Button>
        <Button
          disabled={confirmText !== "DELETE" || deleting}
          onClick={handleDelete}
          className="h-9 flex-1 rounded-lg bg-red font-medium text-white hover:bg-red/90"
        >
          {deleting ? "Deleting…" : "Yes, delete everything"}
        </Button>
      </div>
    </div>
  );
}
