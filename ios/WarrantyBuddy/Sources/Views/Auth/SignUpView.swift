import SwiftUI

struct SignUpView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var fullName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var agreed = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var didSignUp = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    Text("Create your account").font(.brandDisplay(20)).foregroundStyle(Color.brandNavy)
                    Text("Free to start. No credit card needed.")
                        .font(.brandBody(13)).foregroundStyle(.secondary)

                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    if didSignUp {
                        HStack(alignment: .top, spacing: Spacing.sm) {
                            Image(systemName: "envelope.badge.fill").foregroundStyle(Color.brandTeal)
                            Text("Check your email to confirm your account, then sign in.")
                                .font(.brandBody(14))
                        }
                        .padding(Spacing.md)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.brandTeal.opacity(0.1), in: RoundedRectangle(cornerRadius: Radius.sm))
                    } else {
                        labeledField("Full name", text: $fullName, placeholder: "Alex Johnson")
                        labeledField("Email address", text: $email, placeholder: "alex@example.com", keyboard: .emailAddress)
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Password").font(.brandBody(11)).foregroundStyle(.secondary)
                            SecureField("At least 8 characters", text: $password)
                                .textFieldStyle(.roundedBorder)
                        }

                        Toggle(isOn: $agreed) {
                            HStack(spacing: 4) {
                                Text("I agree to the")
                                Button("Terms") { openURL(URL(string: "https://www.mywarrantybuddy.com/terms")!) }
                                    .foregroundStyle(Color.brandTeal)
                                Text("and")
                                Button("Privacy Policy") { openURL(URL(string: "https://www.mywarrantybuddy.com/privacy")!) }
                                    .foregroundStyle(Color.brandTeal)
                            }
                            .font(.brandBody(12))
                        }
                        .toggleStyle(.switch)
                        .tint(.brandTeal)

                        Button {
                            Task { await signUp() }
                        } label: {
                            if isLoading {
                                ProgressView().frame(maxWidth: .infinity)
                            } else {
                                Text("Create account").bold().frame(maxWidth: .infinity)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.brandTeal)
                        .controlSize(.large)
                        .disabled(fullName.isEmpty || email.isEmpty || password.count < 8 || !agreed || isLoading)
                    }
                }
                .padding(24)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    @ViewBuilder
    private func labeledField(_ label: String, text: Binding<String>, placeholder: String, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.brandBody(11)).foregroundStyle(.secondary)
            TextField(placeholder, text: text)
                .textFieldStyle(.roundedBorder)
                .keyboardType(keyboard)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        }
    }

    private func signUp() async {
        isLoading = true
        errorMessage = nil
        do {
            try await SupabaseService.client.auth.signUp(
                email: email,
                password: password,
                data: ["full_name": .string(fullName)]
            )
            Haptics.success()
            didSignUp = true
        } catch {
            Haptics.error()
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
