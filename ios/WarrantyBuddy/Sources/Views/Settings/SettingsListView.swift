import SwiftUI
import UIKit

struct SettingsListView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var profile: UserProfile?
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var copiedForwarding = false

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let errorMessage {
                ContentUnavailableView("Couldn't load settings", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
            } else if var profile {
                Form {
                    Section("Profile for claim emails") {
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
                    }

                    Section("Notifications") {
                        Toggle("Email alerts", isOn: Binding(
                            get: { profile.notificationEmail },
                            set: { profile.notificationEmail = $0; self.profile = profile }
                        ))
                    }

                    Section("Email forwarding") {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Your forwarding address").font(.caption).foregroundStyle(.secondary)
                            HStack {
                                Text(profile.forwardingAddress).font(.footnote).lineLimit(1).truncationMode(.middle)
                                Spacer()
                                Button(copiedForwarding ? "Copied" : "Copy") {
                                    UIPasteboard.general.string = profile.forwardingAddress
                                    copiedForwarding = true
                                }
                                .font(.caption)
                            }
                        }
                    }

                    Section("Plan") {
                        HStack {
                            Text(profile.plan ?? "Free")
                            Spacer()
                            if let status = profile.subscriptionStatus {
                                Text(status).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }

                    Section {
                        Button("Save changes") { Task { await save(profile) } }
                            .disabled(isSaving)
                    }

                    Section {
                        Button("Sign out", role: .destructive) {
                            Task { try? await SupabaseService.client.auth.signOut() }
                        }
                    }
                }
            }
        }
        .navigationTitle("Settings")
        .task { await load() }
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
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
