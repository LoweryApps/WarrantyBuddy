import { NextResponse } from "next/server";
import { buildFeedbackNotificationEmail, sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 4000;

// In-app feedback submission (beta-readiness). Authenticated only — the
// widget only renders inside the logged-in app shell. Stores the message plus
// which page the user was on, then best-effort emails the owner; the row is
// saved regardless of whether that email succeeds.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { message?: string; pagePath?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "empty_message", message: "Enter some feedback first." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: "too_long", message: "That's a bit long — try trimming it down." },
      { status: 400 },
    );
  }

  // A logged-in user could otherwise script repeated submissions — a light
  // per-user cap is enough since this isn't a public/anonymous endpoint.
  const { allowed } = await rateLimit({ key: `feedback:user:${user.id}`, limit: 10, windowSeconds: 3600 });
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "You've sent a lot of feedback — give it a few minutes." },
      { status: 429 },
    );
  }

  const pagePath = typeof body.pagePath === "string" ? body.pagePath.slice(0, 200) : null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    message,
    page_path: pagePath,
    user_agent: userAgent,
  });

  if (error) {
    return NextResponse.json({ error: "save_failed", message: "Couldn't save that — try again." }, { status: 500 });
  }

  const notifyEmail = process.env.FEEDBACK_NOTIFY_EMAIL;
  if (notifyEmail) {
    try {
      const { subject, html } = buildFeedbackNotificationEmail({
        userEmail: user.email ?? "unknown",
        message,
        pagePath,
      });
      await sendEmail({ to: notifyEmail, subject, html });
    } catch {
      // Best-effort — the feedback row is already saved.
    }
  }

  return NextResponse.json({ ok: true });
}
