import SwiftUI
import UIKit

struct SettingsListView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var profile: UserProfile?
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var copiedForwarding = false

    @State private var isExportingCSV = false
    @State private var csvExportURL: URL?

    @State private var isGeneratingInsurance = false
    @State private var insuranceExportURL: URL?
    @State private var insuranceError: String?

    @State private var showingDeleteSheet = false
    @State private var deleteConfirmText = ""
    @State private var isDeletingAccount = false
    @State private var deleteError: String?

    @State private var isOpeningPortal = false
    @State private var billingPortalURL: URL?
    @State private var portalError: String?

    var body: some View {
        VStack(spacing: 0) {
            BrandHeader()
            Text("Settings")
                .font(.brandDisplay(26))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.lg)
                .padding(.bottom, Spacing.sm)

            settingsContent
        }
        .toolbar(.hidden, for: .navigationBar)
        .task { await load() }
        .sheet(item: $csvExportURL) { url in
            ActivityShareSheet(items: [url])
        }
        .sheet(item: $insuranceExportURL) { url in
            SafariView(url: url)
        }
        .sheet(isPresented: $showingDeleteSheet) {
            deleteAccountSheet
        }
        .sheet(item: $billingPortalURL) { url in
            SafariView(url: url)
        }
    }

    @ViewBuilder
    private var settingsContent: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let errorMessage {
                ContentUnavailableView("Couldn't load settings", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
            } else if var profile {
                Form {
                    Section {
                        TextField("Full name", text: Binding(
                            get: { profile.fullName ?? "" },
                            set: { profile.fullName = $0; self.profile = profile }
                        ))
                        TextField("Phone number", text: Binding(
                            get: { profile.phone ?? "" },
                            set: { profile.phone = $0; self.profile = profile }
                        ))
                        TextField("Claim email address", text: Binding(
                            get: { profile.claimEmail ?? "" },
                            set: { profile.claimEmail = $0; self.profile = profile }
                        ))
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                    } header: {
                        Label("Profile for claim emails", systemImage: "person.crop.circle")
                    }

                    Section {
                        Toggle("Email alerts", isOn: Binding(
                            get: { profile.notificationEmail },
                            set: { profile.notificationEmail = $0; self.profile = profile }
                        ))
                    } header: {
                        Label("Notifications", systemImage: "bell")
                    }

                    Section {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Your forwarding address").font(.brandBody(11)).foregroundStyle(.secondary)
                            HStack {
                                Text(profile.forwardingAddress).font(.brandBody(13)).lineLimit(1).truncationMode(.middle)
                                Spacer()
                                Button {
                                    UIPasteboard.general.string = profile.forwardingAddress
                                    Haptics.light()
                                    withAnimation { copiedForwarding = true }
                                } label: {
                                    Label(copiedForwarding ? "Copied" : "Copy", systemImage: copiedForwarding ? "checkmark" : "doc.on.doc")
                                }
                                .font(.brandBody(12))
                            }
                        }
                    } header: {
                        Label("Email forwarding", systemImage: "envelope.arrow.triangle.branch")
                    }

                    let plan = planDisplay(profile)
                    Section {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(plan.label).font(.brandBody(14, weight: .medium))
                                Text(plan.sublabel).font(.brandBody(11)).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if plan.showManageButton {
                                Button {
                                    Task { await openBillingPortal() }
                                } label: {
                                    if isOpeningPortal {
                                        Text("Opening…")
                                    } else {
                                        Text("Manage subscription")
                                    }
                                }
                                .font(.brandBody(11))
                                .buttonStyle(.bordered)
                                .disabled(isOpeningPortal)
                            }
                        }
                        if let portalError {
                            Text(portalError).font(.brandBody(11)).foregroundStyle(Color.brandRed)
                        }
                    } header: {
                        Label("Plan", systemImage: plan.isPremium ? "crown.fill" : "sparkles")
                    } footer: {
                        Text(plan.subtitle)
                    }

                    Section {
                        Button {
                            Task { await save(profile) }
                        } label: {
                            Label("Save changes", systemImage: "checkmark")
                        }
                        .disabled(isSaving)
                    }

                    Section {
                        Button {
                            Task { await exportCSV() }
                        } label: {
                            if isExportingCSV {
                                ProgressView()
                            } else {
                                Label("Export all data as CSV", systemImage: "square.and.arrow.up")
                            }
                        }
                        .disabled(isExportingCSV)

                        Button {
                            Task { await generateInsuranceExport() }
                        } label: {
                            if isGeneratingInsurance {
                                ProgressView()
                            } else {
                                Label("Generate insurance inventory", systemImage: "doc.text")
                            }
                        }
                        .disabled(isGeneratingInsurance)
                        if let insuranceError {
                            Text(insuranceError).font(.brandBody(11)).foregroundStyle(Color.brandRed)
                        }

                        Button(role: .destructive) {
                            showingDeleteSheet = true
                        } label: {
                            Label("Delete my account", systemImage: "trash")
                                .foregroundStyle(Color.brandRed)
                        }
                    } header: {
                        Label("Data & privacy", systemImage: "lock.shield")
                    }

                    Section {
                        Button(role: .destructive) {
                            Task { try? await SupabaseService.client.auth.signOut() }
                        } label: {
                            Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                                .foregroundStyle(Color.brandRed)
                        }
                    }
                }
                .tint(.brandTeal)
            }
        }
    }

    // Mirrors src/components/settings/plan-section.tsx exactly, including
    // the closed-beta behavior: `premium` is hardcoded true here the same
    // way BETA_ALL_FEATURES_UNLOCKED is hardcoded true in
    // src/lib/entitlements.ts — flip both together when the beta ends.
    // Until then, `hasRealSubscription` (a real Stripe subscription_status)
    // is what actually distinguishes "beta access" from "paying customer".
    private func planDisplay(_ profile: UserProfile) -> PlanDisplay {
        let premium = true
        let hasRealSubscription = profile.subscriptionStatus != nil
        let betaUnlocked = premium && !hasRealSubscription

        if betaUnlocked {
            return PlanDisplay(
                isPremium: true,
                subtitle: "Beta — full access",
                label: "All features unlocked",
                sublabel: "Unlimited products & receipts for everyone during the closed beta",
                showManageButton: false
            )
        }
        if premium, let status = profile.subscriptionStatus {
            var sublabel = Self.statusLabels[status] ?? status
            if let currentPeriodEnd = profile.currentPeriodEnd, let date = Self.parseISODate(currentPeriodEnd) {
                sublabel += " · renews \(Self.shortDateFormatter.string(from: date))"
            }
            return PlanDisplay(
                isPremium: true,
                subtitle: "You're on Premium",
                label: profile.plan.flatMap { Self.planLabels[$0] } ?? "Premium",
                sublabel: sublabel,
                showManageButton: true
            )
        }
        return PlanDisplay(
            isPremium: false,
            subtitle: "Free plan",
            label: "Free",
            sublabel: "Up to 5 products, 3 receipts/month",
            showManageButton: false
        )
    }

    private struct PlanDisplay {
        let isPremium: Bool
        let subtitle: String
        let label: String
        let sublabel: String
        let showManageButton: Bool
    }

    private static let planLabels: [String: String] = [
        "founding_monthly": "Founding member — Monthly",
        "founding_annual": "Founding member — Annual",
        "regular_monthly": "Premium — Monthly",
        "regular_annual": "Premium — Annual",
    ]

    private static let statusLabels: [String: String] = [
        "active": "Active",
        "trialing": "Trial",
        "past_due": "Payment past due",
        "canceled": "Canceled",
        "incomplete": "Incomplete",
        "incomplete_expired": "Expired",
        "unpaid": "Unpaid",
    ]

    private static func parseISODate(_ string: String) -> Date? {
        let withFractional = ISO8601DateFormatter()
        withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFractional.date(from: string) { return date }
        return ISO8601DateFormatter().date(from: string)
    }

    private static let shortDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter
    }()

    private func openBillingPortal() async {
        isOpeningPortal = true
        portalError = nil
        do {
            billingPortalURL = try await APIClient.createBillingPortalSession()
        } catch {
            portalError = error.localizedDescription
        }
        isOpeningPortal = false
    }

    private var deleteAccountSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("This will permanently delete all your products, warranties, documents, and receipts. This cannot be undone.")
                    .font(.brandBody(13)).foregroundStyle(Color.brandRed)
                if let deleteError {
                    ErrorBanner(message: deleteError)
                }
                Text("Type DELETE to confirm").font(.brandBody(12)).foregroundStyle(.secondary)
                TextField("DELETE", text: $deleteConfirmText)
                    .textFieldStyle(.roundedBorder)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)
                Button(role: .destructive) {
                    Task { await deleteAccount() }
                } label: {
                    if isDeletingAccount {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Yes, delete everything").bold().frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.brandRed)
                .controlSize(.large)
                .disabled(deleteConfirmText != "DELETE" || isDeletingAccount)
                Spacer()
            }
            .padding(Spacing.lg)
            .navigationTitle("Delete account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showingDeleteSheet = false
                        deleteConfirmText = ""
                        deleteError = nil
                    }
                }
            }
        }
    }

    private func load() async {
        guard let userId = session.userId else { return }
        isLoading = true
        errorMessage = nil
        do {
            let result: UserProfile = try await SupabaseService.client
                .from("users")
                .select("full_name, phone, claim_email, notification_email, forwarding_address, subscription_status, plan, current_period_end")
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            profile = result
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func save(_ profile: UserProfile) async {
        guard let userId = session.userId else { return }
        isSaving = true
        do {
            let payload = UserProfileUpdatePayload(
                fullName: profile.fullName?.isEmpty == true ? nil : profile.fullName,
                phone: profile.phone?.isEmpty == true ? nil : profile.phone,
                claimEmail: profile.claimEmail?.isEmpty == true ? nil : profile.claimEmail,
                notificationEmail: profile.notificationEmail
            )
            try await SupabaseService.client
                .from("users")
                .update(payload)
                .eq("id", value: userId)
                .execute()
            Haptics.success()
        } catch {
            Haptics.error()
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }

    private func exportCSV() async {
        guard let userId = session.userId else { return }
        isExportingCSV = true
        do {
            let products: [ProductWithWarranties] = try await SupabaseService.client
                .from("products")
                .select("*, warranties(*)")
                .eq("user_id", value: userId)
                .order("created_at", ascending: false)
                .execute()
                .value
            let csv = CSVExport.generate(from: products)
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("warrantybuddy-export-\(UUID().uuidString).csv")
            try csv.write(to: url, atomically: true, encoding: .utf8)
            csvExportURL = url
        } catch {
            errorMessage = error.localizedDescription
        }
        isExportingCSV = false
    }

    private func generateInsuranceExport() async {
        isGeneratingInsurance = true
        insuranceError = nil
        do {
            insuranceExportURL = try await APIClient.generateInsuranceExport()
        } catch {
            insuranceError = error.localizedDescription
        }
        isGeneratingInsurance = false
    }

    private func deleteAccount() async {
        isDeletingAccount = true
        deleteError = nil
        do {
            try await APIClient.deleteAccount()
            try? await SupabaseService.client.auth.signOut()
        } catch {
            Haptics.error()
            deleteError = error.localizedDescription
        }
        isDeletingAccount = false
    }
}
