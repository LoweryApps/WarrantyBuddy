import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var didSend = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                Text("Reset your password").font(.brandDisplay(20)).foregroundStyle(Color.brandNavy)
                Text("Enter your email and we'll send you a reset link.")
                    .font(.brandBody(13)).foregroundStyle(.secondary)

                if let errorMessage {
                    ErrorBanner(message: errorMessage)
                }

                if didSend {
                    HStack(alignment: .top, spacing: Spacing.sm) {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(Color.brandTeal)
                        Text("If an account exists for that email, a reset link is on its way.")
                            .font(.brandBody(14))
                    }
                    .padding(Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.brandTeal.opacity(0.1), in: RoundedRectangle(cornerRadius: Radius.sm))
                } else {
                    TextField("alex@example.com", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    Button {
                        Task { await send() }
                    } label: {
                        if isLoading {
                            ProgressView().frame(maxWidth: .infinity)
                        } else {
                            Text("Send reset link").bold().frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.brandTeal)
                    .controlSize(.large)
                    .disabled(email.isEmpty || isLoading)
                }

                Spacer()
            }
            .padding(24)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    private func send() async {
        isLoading = true
        errorMessage = nil
        do {
            try await SupabaseService.client.auth.resetPasswordForEmail(email)
            Haptics.success()
            didSend = true
        } catch {
            Haptics.error()
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
