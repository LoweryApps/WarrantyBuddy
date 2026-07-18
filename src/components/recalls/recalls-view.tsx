"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { RecallCard } from "@/components/recalls/recall-card";
import type { RecallAlertWithProduct } from "@/components/recalls/types";
import { cn } from "@/lib/utils";

export function RecallsView({
  active,
  resolved,
  productCount,
}: {
  active: RecallAlertWithProduct[];
  resolved: RecallAlertWithProduct[];
  productCount: number;
}) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  const isEmpty = active.length === 0 && resolved.length === 0;

  return (
    <div className="mx-auto max-w-2xl p-4 pb-16">
      {!isEmpty && active.length === 0 ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-teal/40 bg-teal/10 p-3">
          <Image src="/brand/buddy-soft-happy.svg" alt="" width={28} height={35} />
          <div className="text-xs leading-relaxed text-teal">
            <span className="font-medium">No active recalls</span> on any of your{" "}
            {productCount} product{productCount === 1 ? "" : "s"}. Buddy checks every day.
          </div>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Image src="/brand/buddy-soft-happy.svg" alt="" width={56} height={69} />
          <div className="font-display text-base font-bold text-navy">No recalls yet</div>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-ink">
            Buddy checks every day across CPSC and NHTSA. You&apos;ll see
            anything that matches your products here, and get an email alert
            the moment it happens.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 ? (
            <div className="mb-5">
              <div className="mb-2.5 flex items-center gap-2 text-[10px] tracking-wide text-ink uppercase">
                Active recalls
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red/15 px-1.5 text-[10px] font-medium text-red">
                  {active.length}
                </span>
              </div>
              {active.map((alert) => (
                <RecallCard key={alert.id} alert={alert} onChanged={refresh} />
              ))}
            </div>
          ) : null}

          {resolved.length > 0 ? (
            <div>
              <div
                className={cn(
                  "mb-2.5 flex items-center gap-2 text-[10px] tracking-wide text-ink uppercase",
                  active.length > 0 && "mt-6",
                )}
              >
                Resolved
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink/10 px-1.5 text-[10px] font-medium text-ink">
                  {resolved.length}
                </span>
              </div>
              {resolved.map((alert) => (
                <RecallCard key={alert.id} alert={alert} onChanged={refresh} />
              ))}
            </div>
          ) : null}

          <div className="mt-5 rounded-[10px] border border-border bg-white p-3.5 text-center">
            <p className="text-[11px] leading-relaxed text-ink">
              Buddy checks for new recalls every day across CPSC and NHTSA.
              You&apos;ll get an email alert the moment anything matches your
              products.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
