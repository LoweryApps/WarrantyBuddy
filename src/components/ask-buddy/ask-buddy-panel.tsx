"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FileText, Send, X } from "lucide-react";
import { PaywallBlock } from "@/components/paywall/paywall-block";
import { UpgradeDialog } from "@/components/paywall/upgrade-dialog";
import { PRODUCT_SUGGESTIONS, VAULT_SUGGESTIONS } from "@/lib/ask-buddy";
import type { WarrantyStatus } from "@/lib/warranty";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<WarrantyStatus, string> = {
  active: "Warranty active",
  expiring: "Warranty expiring soon",
  expired: "Warranty expired",
  none: "No warranty on file",
};

interface ChatMessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  source: string | null;
  created_at: string;
}

type AskBuddyPanelProps = { onClose: () => void } & (
  | { mode: "vault"; productCount: number }
  | { mode: "product"; productId: string; productName: string; status: WarrantyStatus; onUploadDocument: () => void }
);

let tempIdCounter = 0;
function nextTempId(): string {
  tempIdCounter += 1;
  return `pending-${tempIdCounter}`;
}

export function AskBuddyPanel(props: AskBuddyPanelProps) {
  const { onClose, mode } = props;
  const productId = mode === "product" ? props.productId : null;

  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [hasDocument, setHasDocument] = useState<boolean | null>(null);
  const [standardTermsChosen, setStandardTermsChosen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [notConfigured, setNotConfigured] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = productId ? `/api/ask-buddy?productId=${productId}` : "/api/ask-buddy";
    fetch(url)
      .then((res) => res.json())
      .then((body) => {
        setMessages(body.messages ?? []);
        setHasDocument(body.hasDocument ?? null);
      })
      .finally(() => setLoadingHistory(false));
  }, [productId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const optimistic: ChatMessageRow = {
      id: nextTempId(),
      role: "user",
      content: trimmed,
      source: null,
      created_at: "",
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);
    setSendError(null);

    try {
      const res = await fetch("/api/ask-buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, message: trimmed }),
      });
      const body = await res.json();

      if (res.status === 503) {
        setNotConfigured(body.message);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        return;
      }

      if (res.status === 402) {
        setPremiumRequired(true);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        return;
      }

      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id && body.userMessage ? body.userMessage : m)),
        );
        setSendError(body.message ?? "Buddy couldn't respond — try again.");
        return;
      }

      setMessages((prev) => [
        ...prev.map((m) => (m.id === optimistic.id ? body.userMessage : m)),
        body.reply,
      ]);
    } catch {
      setSendError("Buddy couldn't respond — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const suggestions = mode === "vault" ? VAULT_SUGGESTIONS : PRODUCT_SUGGESTIONS;
  const showSuggestions = messages.length === 0 && !sending;
  const showNoDocGate =
    mode === "product" && hasDocument === false && messages.length === 0 && !standardTermsChosen && !loadingHistory;

  const headerTitle = "Ask Buddy";
  const headerSub =
    mode === "vault"
      ? `${props.productCount} product${props.productCount === 1 ? "" : "s"} · vault-wide`
      : `${props.productName} · ${STATUS_LABEL[props.status]}`;

  return (
    <div className="fixed right-0 bottom-0 z-50 flex h-[520px] w-[340px] flex-col rounded-tl-2xl border border-border bg-white shadow-2xl">
      <div className="flex items-center gap-2.5 rounded-tl-2xl bg-navy px-3.5 py-3">
        <Image src="/brand/buddy-soft.svg" alt="" width={24} height={30} />
        <div className="flex-1 overflow-hidden">
          <div className="truncate text-xs font-medium text-white">{headerTitle}</div>
          <div className="truncate text-[10px] text-white/45">{headerSub}</div>
        </div>
        <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {premiumRequired ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <PaywallBlock
            title="Ask Buddy is a Premium feature"
            message="Upgrade to Premium to chat with Buddy about your warranties, coverage, and known product issues."
            onUpgrade={() => setUpgradeOpen(true)}
          />
          <UpgradeDialog
            open={upgradeOpen}
            onOpenChange={setUpgradeOpen}
            reason="Ask Buddy is a Premium feature."
          />
        </div>
      ) : notConfigured ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
          <Image src="/brand/buddy-soft-thinking.svg" alt="" width={40} height={50} />
          <div className="rounded-[10px] bg-red/5 p-3 text-xs text-red">{notConfigured}</div>
        </div>
      ) : loadingHistory ? (
        <div className="flex flex-1 items-center justify-center text-xs text-ink">Loading…</div>
      ) : showNoDocGate ? (
        <div className="flex flex-1 flex-col">
          <div className="flex-1 p-3.5">
            <div className="flex items-start gap-2">
              <Image src="/brand/buddy-soft.svg" alt="" width={20} height={25} className="mt-0.5 shrink-0" />
              <div className="max-w-[85%] rounded-[0_10px_10px_10px] bg-cloud px-2.5 py-2 text-[12px] leading-relaxed text-foreground">
                {`No warranty document has been uploaded for ${props.mode === "product" ? props.productName : "this product"} yet, so I can't give you answers specific to your coverage.`}
                <div className="mt-1.5 flex items-center gap-1 border-t border-border pt-1.5 text-[10px] text-ink">
                  Answers will use standard brand terms if you proceed
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2.5 p-4 pt-0 text-center">
            <button
              type="button"
              onClick={() => props.mode === "product" && props.onUploadDocument()}
              className="w-full rounded-lg bg-navy py-2 text-xs font-medium text-white hover:bg-navy/90"
            >
              Upload warranty doc
            </button>
            <button
              type="button"
              onClick={() => setStandardTermsChosen(true)}
              className="text-[11px] text-teal underline underline-offset-2"
            >
              Answer using standard terms →
            </button>
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3.5">
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} />
            ))}
            {sending ? <ThinkingBubble /> : null}
          </div>

          {showSuggestions ? (
            <div className="px-3.5 pb-3">
              <div className="mb-1.5 text-[10px] tracking-wide text-ink uppercase">Suggested questions</div>
              <div className="flex flex-col gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="rounded-md border border-border bg-cloud px-2.5 py-1.5 text-left text-[11px] text-ink hover:bg-white hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {sendError ? (
            <div className="mx-3.5 mb-2 rounded-[10px] bg-red/5 p-2.5 text-[11px] text-red">{sendError}</div>
          ) : null}

          <div className="flex items-center gap-2 border-t border-border p-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage(input);
              }}
              placeholder={mode === "vault" ? "Ask about your vault…" : "Ask about your warranty…"}
              disabled={sending}
              className="h-9 flex-1 rounded-lg border border-border bg-cloud px-2.5 text-[12px] text-foreground outline-none focus:border-teal disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal text-navy disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessageRow }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[10px_0_10px_10px] bg-navy px-2.5 py-2 text-[12px] leading-relaxed whitespace-pre-wrap text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <Image src="/brand/buddy-soft.svg" alt="" width={20} height={25} className="mt-0.5 shrink-0" />
      <div className="max-w-[80%] rounded-[0_10px_10px_10px] bg-cloud px-2.5 py-2 text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">
        {message.content}
        {message.source ? (
          <div className="mt-1.5 flex items-center gap-1 border-t border-border pt-1.5 text-[10px] text-ink">
            <FileText className="h-2.5 w-2.5 shrink-0" />
            {message.source}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-2">
      <Image src="/brand/buddy-soft.svg" alt="" width={20} height={25} className="mt-0.5 shrink-0" />
      <div className="flex items-center gap-1 rounded-[0_10px_10px_10px] bg-cloud px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("h-1.5 w-1.5 animate-bounce rounded-full bg-ink/50")}
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
