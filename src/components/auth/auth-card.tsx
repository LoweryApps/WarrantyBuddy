import Image from "next/image";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AuthCard({
  tagline,
  children,
}: {
  tagline?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="w-full max-w-sm gap-0 rounded-2xl py-0 shadow-xl shadow-navy/10 ring-0">
      <CardHeader className="flex flex-col items-center gap-3 rounded-t-2xl bg-navy px-6 py-8 text-center">
        <Image
          src="/brand/buddy-soft.svg"
          alt="WarrantyBuddy"
          width={52}
          height={64}
          priority
        />
        <div className="font-display text-xl font-bold tracking-tight">
          <span className="text-white">Warranty</span>
          <span className="text-teal">Buddy</span>
        </div>
        {tagline ? (
          <p className="text-xs leading-relaxed text-white/55">{tagline}</p>
        ) : null}
      </CardHeader>
      <CardContent className="px-6 py-6">{children}</CardContent>
    </Card>
  );
}
