import { FileText, TriangleAlert } from "lucide-react";
import { PID_SOURCE_LABEL } from "@/lib/product-intelligence";
import type { PidSeverity, PidSource } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export interface KnownIssueRecord {
  failure_type: string;
  failure_description: string | null;
  complaint_count: number;
  severity: PidSeverity;
  source: PidSource;
  source_url: string | null;
}

const SEVERITY_TONE: Record<PidSeverity, string> = {
  "Safety Hazard": "border-red/30 bg-red/5 text-red",
  Major: "border-amber/30 bg-amber/10 text-amber",
  Minor: "border-border bg-cloud text-ink",
};

export function KnownIssueBanner({
  record,
  className,
}: {
  record: KnownIssueRecord;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border p-3.5", SEVERITY_TONE[record.severity], className)}>
      <div className="mb-1.5 flex items-center gap-2">
        <TriangleAlert className="h-4 w-4 shrink-0" />
        <div className="text-xs font-medium">
          {record.severity === "Safety Hazard" ? "Safety issue reported" : "Known issue reported"}
          {": "}
          {record.failure_type}
        </div>
      </div>

      {record.failure_description ? (
        <p className="mb-2 text-[11px] leading-relaxed opacity-90">{record.failure_description}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1 text-[10px] opacity-75">
        <FileText className="h-2.5 w-2.5 shrink-0" />
        {record.complaint_count} {PID_SOURCE_LABEL[record.source]}
        {record.source_url ? (
          <>
            {" · "}
            <a
              href={record.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Official source
            </a>
          </>
        ) : null}
      </div>

      <p className="mt-1.5 text-[9px] leading-relaxed opacity-60">
        This information is based on publicly available complaint data and user reports. WarrantyBuddy
        does not independently verify these reports.
      </p>
    </div>
  );
}
