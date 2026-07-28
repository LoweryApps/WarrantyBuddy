import type { Metadata } from "next";
import { LegalPageShell } from "@/components/public/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — WarrantyBuddy",
  description: "How WarrantyBuddy collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="July 28, 2026">
      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">1. Overview</h2>
        <p>
          WarrantyBuddy (&quot;we,&quot; &quot;us&quot;) helps you track the products you own, their warranties, receipts, and
          applicable safety recalls. This policy explains what information we collect, how we use it, which third parties
          process it on our behalf, and the choices you have.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">2. Information we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information:</strong> your name, email address, and password. Passwords are handled entirely by
            our authentication provider (Supabase Auth) and are never visible to us in plain text.
          </li>
          <li>
            <strong>Product and warranty information you enter:</strong> product name, brand, model and serial numbers,
            category, purchase date and price, retailer, and warranty terms.
          </li>
          <li>
            <strong>Photos and documents you upload:</strong> product label photos, receipts, warranty documents, and
            manuals, stored in a private file bucket tied to your account.
          </li>
          <li>
            <strong>Emails you forward to us:</strong> if you use receipt-forwarding, we parse the forwarded email and any
            attachments to extract receipt or warranty details.
          </li>
          <li>
            <strong>Payment information:</strong> handled entirely by Stripe. We never receive or store your full card
            number — only a subscription status and plan identifier.
          </li>
          <li>
            <strong>Usage data:</strong> request counts used purely for rate-limiting (preventing abuse of AI and search
            features), and basic server logs.
          </li>
          <li>
            <strong>Recall checker (no account needed):</strong> if you use the free public recall checker at
            /recall-check, your search terms are sent to our server to look up recall records; we do not attach them to an
            account. If you sign up for recall email alerts on our public pages, we store your email and the
            categories/brands you asked to follow, solely to send those alerts, with a one-click unsubscribe on every
            email.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">3. How we use AI</h2>
        <p className="mb-2">
          WarrantyBuddy uses Anthropic&apos;s Claude API to power several features: reading product labels and receipts you
          photograph, answering questions in Ask Buddy, drafting claim emails, and matching warranty terms to plain-language
          questions. When you use these features, the relevant photo, document text, or question is sent to Anthropic&apos;s
          API to generate a response.
        </p>
        <p className="mb-2">
          Under Anthropic&apos;s standard commercial API terms, data submitted through the API is not used to train
          Anthropic&apos;s models by default. We do not send AI providers more than what a feature needs to function — for
          example, a label photo is sent only to extract brand/model/serial text, not shared with any other party.
        </p>
        <p>
          Content you upload is treated as untrusted input: our prompts explicitly instruct the AI to treat any
          instruction-like text found inside a photo or document as literal content to report, never as a command to
          follow.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">4. Service providers we use</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Supabase</strong> — database, authentication, and encrypted file storage.</li>
          <li><strong>Anthropic</strong> — AI processing for label/receipt extraction, Ask Buddy, and claim drafting.</li>
          <li><strong>Stripe</strong> — subscription billing and payment processing.</li>
          <li><strong>Resend</strong> — transactional emails (e.g. recall alerts, account notices).</li>
          <li><strong>Postmark</strong> — inbound email parsing for the receipt-forwarding feature.</li>
          <li><strong>UPCitemdb</strong> — barcode-to-product lookup (only the scanned barcode is sent, no personal data).</li>
          <li>
            <strong>CPSC, NHTSA, FDA, and USDA</strong> — public U.S. government recall data sources we check on your
            behalf; we don&apos;t send them any of your personal information.
          </li>
          <li><strong>Vercel</strong> — hosting infrastructure.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">5. Data retention and deletion</h2>
        <p>
          You can delete your account at any time from Settings. Doing so permanently removes your products, warranties,
          documents, photos, and chat history from our systems, including the underlying file storage. This action cannot
          be undone.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">6. Security</h2>
        <p>
          Your data is protected by database-level access rules that restrict every record to your own account, private
          (non-public) file storage, encrypted connections (HTTPS/TLS) everywhere, and rate limiting on sensitive
          endpoints. No method of storage or transmission is 100% secure, but we design every feature around only
          exposing what a signed-in user is authorized to see.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">7. Your rights</h2>
        <p>
          You can access, correct, export, or delete your data at any time from within the app. If you have questions
          about your data that aren&apos;t covered here, contact us at the email below.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">8. Children&apos;s privacy</h2>
        <p>WarrantyBuddy is not directed at children under 13, and we do not knowingly collect their information.</p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">9. Changes to this policy</h2>
        <p>
          We may update this policy as the product changes. We&apos;ll update the &quot;last updated&quot; date above when we
          do.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">10. Contact</h2>
        <p>
          Questions about this policy or your data: <span className="text-teal">admin@mywarrantybuddy.com</span>
        </p>
      </section>
    </LegalPageShell>
  );
}
