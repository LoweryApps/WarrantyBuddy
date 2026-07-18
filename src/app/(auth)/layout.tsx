// These pages read live Supabase session state (recovery links, resend
// cooldowns) — never statically prerender them.
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-cloud px-4 py-10">
      {children}
    </div>
  );
}
