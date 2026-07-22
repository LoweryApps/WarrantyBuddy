import { redirect } from "next/navigation";
import { AppNav } from "@/components/layout/app-nav";
import { FeedbackWidget } from "@/components/layout/feedback-widget";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col bg-cloud">
      <AppNav
        fullName={profile?.full_name ?? null}
        email={profile?.email ?? user.email ?? ""}
      />
      <div className="flex-1">{children}</div>
      <FeedbackWidget />
    </div>
  );
}
