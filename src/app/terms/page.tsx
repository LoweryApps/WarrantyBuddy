import type { Metadata } from "next";
import { LegalPageShell } from "@/components/public/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service — WarrantyBuddy",
  description: "The terms that govern your use of WarrantyBuddy.",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" updated="July 28, 2026">
      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">1. Acceptance of terms</h2>
        <p>
          By creating an account or using WarrantyBuddy, you agree to these Terms of Service and our{" "}
          <a href="/privacy" className="text-teal underline underline-offset-2">
            Privacy Policy
          </a>
          . If you don&apos;t agree, please don&apos;t use the service.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">2. What WarrantyBuddy does</h2>
        <p>
          WarrantyBuddy helps you catalog products you own, store warranty and receipt documents, track coverage windows,
          and get notified when something you own is subject to a government safety recall. Some features (photo/receipt
          extraction, Ask Buddy, claim-email drafting) use AI to read and summarize content you provide.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">3. Your account</h2>
        <p>
          You&apos;re responsible for keeping your login credentials secure and for all activity under your account. Let us
          know right away if you suspect unauthorized access.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">4. Subscriptions and billing</h2>
        <p>
          Free accounts are limited to a set number of products. Paid plans unlock unlimited products and additional
          AI-powered features, billed monthly or annually through Stripe. You can cancel anytime from Settings; access
          continues through the end of the paid period. We don&apos;t offer prorated refunds for partial billing periods
          except where required by law.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">5. Recall information disclaimer</h2>
        <p>
          Recall information shown in WarrantyBuddy is aggregated from public U.S. government sources (CPSC, NHTSA, FDA,
          and USDA) and is provided for convenience only. WarrantyBuddy does not independently verify recall data and
          does not guarantee that every recall is captured, or captured immediately — this depends on when each agency
          publishes its own data. WarrantyBuddy is not a substitute for the official recall notice; always confirm
          details with the issuing agency and the manufacturer before acting.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">6. AI features disclaimer</h2>
        <p>
          Ask Buddy, claim-email drafting, and label/receipt extraction use AI and can make mistakes — misread a label,
          misinterpret a warranty term, or draft an incomplete claim email. These features are informational aids, not a
          substitute for reading your actual warranty documents or for legal or professional advice. Always review
          AI-generated content before relying on it or sending it to a manufacturer or retailer.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">7. Acceptable use</h2>
        <p>
          Don&apos;t use WarrantyBuddy to upload content you don&apos;t have the right to use, to attempt to disrupt or
          abuse the service (including its AI or recall-lookup features), or to attempt to access another user&apos;s
          data.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">8. Termination</h2>
        <p>
          You can delete your account at any time from Settings. We may suspend or terminate accounts that violate these
          terms.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">9. Disclaimer and limitation of liability</h2>
        <p>
          WarrantyBuddy is provided &quot;as is,&quot; without warranties of any kind. To the fullest extent permitted by
          law, we aren&apos;t liable for missed warranty deadlines, missed recalls, or decisions made based on
          AI-generated content — WarrantyBuddy is a tracking and convenience tool, not a guarantee of any outcome.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">10. Changes to these terms</h2>
        <p>We may update these terms as the product changes. We&apos;ll update the &quot;last updated&quot; date above when we do.</p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">11. Contact</h2>
        <p>
          Questions about these terms: <span className="text-teal">admin@mywarrantybuddy.com</span>
        </p>
      </section>
    </LegalPageShell>
  );
}
