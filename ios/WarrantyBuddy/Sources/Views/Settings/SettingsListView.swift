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

    var body: some View {
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

                    Section {
                        HStack {
                            Text(profile.plan ?? "Free")
                            Spacer()
                            if let status = profile.subscriptionStatus {
                                Text(status).font(.brandBody(11)).foregroundStyle(.secondary)
                            }
                        }
                    } header: {
                        Label("Plan", systemImage: "star")
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
        .navigationTitle("Settings")
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
                .select("full_name, phone, claim_email, notification_email, forwarding_address, subscription_status, plan")
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
