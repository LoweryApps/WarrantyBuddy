import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var didSend = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Reset your password").font(.title3).bold()
                Text("Enter your email and we'll send you a reset link.")
                    .font(.footnote).foregroundStyle(.secondary)

                if let errorMessage {
                    Text(errorMessage).font(.footnote).foregroundStyle(.red)
                }

                if didSend {
                    Text("If an account exists for that email, a reset link is on its way.")
                        .font(.subheadline)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.teal.opacity(0.1), in: RoundedRectangle(cornerRadius: 8))
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
                    .tint(.teal)
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
            didSend = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
