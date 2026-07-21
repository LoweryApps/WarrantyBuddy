"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import Link from "next/link";
import { StepHeader } from "@/components/claims/step-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Step5Email({ productId }: { productId: string }) {
  const [issue, setIssue] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!issue.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/claim-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, issue }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Couldn't draft the email. Try again.");
        return;
      }
      setEmail(body.email);
    } catch {
      setError("Couldn't draft the email. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard permission denied — nothing more we can do.
    }
  }

  if (email) {
    return (
      <div>
        <StepHeader
          title="Here's your claim email"
          subtitle="Review it, then copy and paste it into your email app."
        />

        <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-medium text-teal">
          <Sparkles className="h-3 w-3" />
          Buddy drafted this
        </div>

        <div className="mb-3 whitespace-pre-wrap rounded-lg border border-border bg-cloud p-3.5 text-[11px] leading-relaxed text-foreground">
          {email}
        </div>

        <div className="mb-3 flex gap-2">
          <Button
            onClick={handleCopy}
            className="h-10 flex-1 rounded-lg bg-teal font-medium text-navy hover:bg-teal/90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy email"}
          </Button>
          <Button
            onClick={() => setEmail(null)}
            variant="outline"
            className="h-10 flex-1 rounded-lg border-border text-foreground hover:bg-cloud"
          >
            Edit issue
          </Button>
        </div>

        <Link href={`/products/${productId}`}>
          <Button
            variant="outline"
            className="h-10 w-full rounded-lg border-border text-ink hover:bg-cloud"
          >
            Done — back to product
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        title="Briefly describe the issue"
        subtitle="Buddy will write the full claim email. Just tell it what's wrong in a few words."
      />

      {error ? <p className="mb-2 text-xs text-red">{error}</p> : null}

      <Textarea
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
        rows={4}
        placeholder="e.g. Ice maker has stopped producing ice and is leaking water onto the freezer floor"
        className="mb-3 rounded-lg border-border bg-white text-sm"
      />

      <Button
        disabled={!issue.trim() || loading}
        onClick={handleGenerate}
        className="h-11 w-full rounded-lg bg-teal font-medium text-navy hover:bg-teal/90"
      >
        <Sparkles className="h-4 w-4" />
        {loading ? "Drafting…" : "Generate claim email"}
      </Button>
    </div>
  );
}
