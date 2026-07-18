import { Check, Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WarrantyStatus } from "@/lib/warranty";

const STATUS_MAP: Record<
  WarrantyStatus,
  { label: string; classes: string; icon: typeof Check | null }
> = {
  active: { label: "Active", classes: "bg-teal/10 text-teal", icon: Check },
  expiring: { label: "Expiring", classes: "bg-amber/15 text-amber", icon: Clock },
  expired: { label: "Expired", classes: "bg-red/10 text-red", icon: X },
  none: { label: "No warranty", classes: "bg-ink/10 text-ink", icon: null },
};

export function WarrantyBadge({ status }: { status: WarrantyStatus }) {
  const { label, classes, icon: Icon } = STATUS_MAP[status];
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 rounded-full border-0 font-medium", classes)}
    >
      {Icon ? <Icon className="h-2.5 w-2.5" /> : null}
      {label}
    </Badge>
  );
}
