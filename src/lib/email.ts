import { Resend } from "resend";

// Hardcoded to match supabase/templates/*.html — email clients don't support
// CSS variables, so this is the sanctioned exception to the app-wide
// "no hardcoded hex" rule.
const BRAND = {
  navy: "#0F1F3D",
  teal: "#00C2A8",
  cloud: "#F4F6F8",
  ink: "#5B6B82",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block; background-color:${BRAND.teal}; color:${BRAND.navy}; font-weight:600; font-size:14px; text-decoration:none; padding:14px 32px; border-radius:12px;">${escapeHtml(label)}</a>`;
}

function shell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:${BRAND.cloud}; font-family:'Hanken Grotesk', Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cloud}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border-radius:16px; overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND.navy}; padding:32px 24px; text-align:center;">
                <div style="font-family:'Space Grotesk', Arial, sans-serif; font-weight:700; font-size:22px; letter-spacing:-0.02em;">
                  <span style="color:#FFFFFF;">Warranty</span><span style="color:${BRAND.teal};">Buddy</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 24px; text-align:center;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface RecallAlertEmailParams {
  recipientName: string | null;
  productName: string;
  brand: string | null;
  modelNumber: string | null;
  recallSource: string;
  recallDescription: string | null;
  recallRemedy: string | null;
  appUrl: string;
}

export function buildRecallAlertEmail(p: RecallAlertEmailParams) {
  const subject = `Recall alert: ${p.productName}`;
  const greeting = p.recipientName ? `Hi ${escapeHtml(p.recipientName)},` : "Hi,";
  const productLabel = [p.brand, p.modelNumber]
    .filter((v): v is string => !!v)
    .map(escapeHtml)
    .join(" ");

  const body = `
    <h1 style="margin:0 0 8px; font-family:'Space Grotesk', Arial, sans-serif; font-size:20px; color:${BRAND.navy};">
      Recall alert on your ${escapeHtml(p.productName)}
    </h1>
    <p style="margin:0 0 20px; font-size:14px; line-height:1.6; color:${BRAND.ink}; text-align:left;">
      ${greeting} Buddy found a ${escapeHtml(p.recallSource)} recall matching a product in your vault${productLabel ? ` (${productLabel})` : ""}.
    </p>
    <div style="text-align:left; background-color:${BRAND.cloud}; border-radius:12px; padding:16px 20px; margin-bottom:20px;">
      ${p.recallDescription ? `<p style="margin:0 0 8px; font-size:13px; line-height:1.5; color:${BRAND.navy};"><strong>Issue:</strong> ${escapeHtml(p.recallDescription)}</p>` : ""}
      ${p.recallRemedy ? `<p style="margin:0; font-size:13px; line-height:1.5; color:${BRAND.navy};"><strong>Remedy:</strong> ${escapeHtml(p.recallRemedy)}</p>` : ""}
    </div>
    ${ctaButton(`${p.appUrl}/recalls`, "View recall details")}
    <p style="margin:24px 0 0; font-size:12px; line-height:1.6; color:${BRAND.ink};">
      You're receiving this because email alerts are enabled in your WarrantyBuddy Settings. You can turn these off anytime.
    </p>
  `;

  return { subject, html: shell(body) };
}

export interface WarrantyReminderEmailParams {
  recipientName: string | null;
  productName: string;
  endDateLabel: string;
  daysRemaining: number;
  productUrl: string;
  knownIssue: { failureType: string; complaintCount: number; sourceLabel: string } | null;
}

export function buildWarrantyReminderEmail(p: WarrantyReminderEmailParams) {
  const subject = `Your ${p.productName} warranty expires soon`;
  const greeting = p.recipientName ? `Hi ${escapeHtml(p.recipientName)},` : "Hi,";

  // Spec 7.3's own example copy for this moment: "Owners of this model
  // commonly report X — inspect before your coverage ends."
  const knownIssueLine = p.knownIssue
    ? `<p style="margin:0 0 20px; font-size:13px; line-height:1.6; color:${BRAND.navy}; text-align:left; background-color:${BRAND.cloud}; border-radius:10px; padding:12px 14px;">
        Owners of this model commonly report <strong>${escapeHtml(p.knownIssue.failureType.toLowerCase())}</strong> (${p.knownIssue.complaintCount} ${escapeHtml(p.knownIssue.sourceLabel)}) — worth inspecting for this before your coverage ends.
      </p>`
    : "";

  const body = `
    <h1 style="margin:0 0 8px; font-family:'Space Grotesk', Arial, sans-serif; font-size:20px; color:${BRAND.navy};">
      Warranty expiring soon
    </h1>
    <p style="margin:0 0 20px; font-size:14px; line-height:1.6; color:${BRAND.ink}; text-align:left;">
      ${greeting} your <strong>${escapeHtml(p.productName)}</strong> warranty expires in ${p.daysRemaining} day${p.daysRemaining === 1 ? "" : "s"}, on ${escapeHtml(p.endDateLabel)}. If anything's gone wrong, now's the time to file a claim while you're still covered.
    </p>
    ${knownIssueLine}
    ${ctaButton(p.productUrl, "View product")}
    <p style="margin:24px 0 0; font-size:12px; line-height:1.6; color:${BRAND.ink};">
      You're receiving this because email alerts are enabled in your WarrantyBuddy Settings. You can turn these off anytime.
    </p>
  `;

  return { subject, html: shell(body) };
}

export interface FeedbackNotificationEmailParams {
  userEmail: string;
  message: string;
  pagePath: string | null;
}

// Notifies the owner of a new in-app feedback submission (beta-readiness).
// Best-effort — the feedback row is already saved regardless of whether this
// send succeeds.
export function buildFeedbackNotificationEmail(p: FeedbackNotificationEmailParams) {
  const subject = `New feedback from ${p.userEmail}`;
  const body = `
    <h1 style="margin:0 0 8px; font-family:'Space Grotesk', Arial, sans-serif; font-size:20px; color:${BRAND.navy};">
      New feedback
    </h1>
    <p style="margin:0 0 16px; font-size:13px; color:${BRAND.ink}; text-align:left;">
      From <strong>${escapeHtml(p.userEmail)}</strong>${p.pagePath ? ` on <code>${escapeHtml(p.pagePath)}</code>` : ""}
    </p>
    <div style="text-align:left; background-color:${BRAND.cloud}; border-radius:12px; padding:16px 20px; white-space:pre-wrap; font-size:14px; line-height:1.6; color:${BRAND.navy};">${escapeHtml(p.message)}</div>
  `;
  return { subject, html: shell(body) };
}

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Resend is not configured — RESEND_API_KEY / RESEND_FROM_EMAIL missing.");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
