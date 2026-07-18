"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { label: "Vault", href: "/dashboard" },
  { label: "Recalls", href: "/recalls" },
  { label: "Settings", href: "/settings" },
];

export function AppNav({
  fullName,
  email,
}: {
  fullName: string | null;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="bg-navy">
      <div className="mx-auto flex h-[50px] max-w-[900px] items-center gap-3 px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/brand/buddy-soft.svg" alt="" width={22} height={27} />
          <span className="font-display text-sm font-bold tracking-tight">
            <span className="text-white">Warranty</span>
            <span className="text-teal">Buddy</span>
          </span>
        </Link>

        <div className="flex-1" />

        <Link
          href="/settings"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-4 w-4" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar size="sm" className="cursor-pointer">
              <AvatarFallback className="bg-teal font-medium text-navy">
                {initials(fullName, email)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">{email}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings">Settings</Link>} />
            <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mx-auto flex max-w-[900px] gap-1 border-t border-white/10 px-5">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-3.5 py-2 text-xs transition-colors",
                active
                  ? "border-teal text-white"
                  : "border-transparent text-white/45 hover:text-white/70",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
