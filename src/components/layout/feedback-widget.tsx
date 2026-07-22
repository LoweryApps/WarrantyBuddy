"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Floating feedback entry point, mounted once in the authenticated app shell
// (beta-readiness) so a tester can report something from wherever they are.
// The current page path rides along automatically so a report always has
// triage context without the user having to describe where they were.
export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMessage("");
    setStatus("idle");
    setError(null);
  }

  async function submit() {
    if (!message.trim()) return;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, pagePath: pathname }),
      });
      const body = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(body.message ?? "Couldn't send that — try again.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Couldn't send that — try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        // Stacked above the bottom-right corner (not on it) — the Dashboard's
        // Ask Buddy FAB (src/components/dashboard/ask-buddy-fab.tsx) already
        // occupies right-5 bottom-5 at the same z-index, so this sits one slot
        // higher rather than overlapping it.
        className="fixed right-5 bottom-24 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-navy text-white shadow-lg transition-transform hover:scale-105 hover:bg-navy/90"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent>
          {status === "done" ? (
            <>
              <DialogHeader>
                <DialogTitle>Thanks for the feedback</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Got it — really appreciate you taking the time during the beta.
              </p>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Send feedback</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Found a bug, or something feels off? Let us know — this goes straight to the team.
              </p>
              <Textarea
                autoFocus
                rows={5}
                placeholder="What's going on?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status === "loading"}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <DialogFooter>
                <Button
                  onClick={submit}
                  disabled={status === "loading" || !message.trim()}
                >
                  {status === "loading" ? "Sending…" : "Send feedback"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
