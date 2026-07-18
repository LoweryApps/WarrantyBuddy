import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AuthInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "h-11 rounded-[10px] border-border bg-white px-3 text-sm focus-visible:border-teal focus-visible:ring-teal/15",
        className,
      )}
      {...props}
    />
  );
}
