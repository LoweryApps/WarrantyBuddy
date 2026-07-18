"use client";

import Image from "next/image";
import { useState } from "react";
import { AskBuddyPanel } from "@/components/ask-buddy/ask-buddy-panel";

export function AskBuddyFab({ productCount }: { productCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full bg-navy py-2.5 px-4 text-xs font-medium text-white shadow-lg transition-transform hover:scale-105"
      >
        <Image src="/brand/buddy-soft.svg" alt="" width={18} height={22} />
        Ask Buddy
      </button>

      {open ? (
        <AskBuddyPanel mode="vault" productCount={productCount} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
