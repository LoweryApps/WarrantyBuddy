import SwiftUI

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingSignUp = false
    @State private var showingForgotPassword = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    VStack(spacing: 6) {
                        Text("Warranty")
                            .font(.brandDisplay(28))
                            .foregroundStyle(Color.brandNavy)
                        + Text("Buddy")
                            .font(.brandDisplay(28))
                            .foregroundStyle(Color.brandTeal)
                        Text("Welcome back")
                            .font(.brandBody(14))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 24)

                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    VStack(alignment: .leading, spacing: 14) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Email address").font(.brandBody(11)).foregroundStyle(.secondary)
                            TextField("alex@example.com", text: $email)
                                .textFieldStyle(.roundedBorder)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Password").font(.brandBody(11)).foregroundStyle(.secondary)
                            SecureField("••••••••••••", text: $password)
                                .textFieldStyle(.roundedBorder)
                        }
                        Button("Forgot password?") { showingForgotPassword = true }
                            .font(.brandBody(12))
                            .foregroundStyle(Color.brandTeal)
                    }

                    Button {
                        Task { await signIn() }
                    } label: {
                        if isLoading {
                            ProgressView().frame(maxWidth: .infinity)
                        } else {
                            Text("Sign in").bold().frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.brandTeal)
                    .controlSize(.large)
                    .disabled(email.isEmpty || password.isEmpty || isLoading)

                    Button("Don't have an account? Sign up free") { showingSignUp = true }
                        .font(.brandBody(12))
                        .foregroundStyle(Color.brandTeal)
                }
                .padding(24)
            }
            .sheet(isPresented: $showingSignUp) { SignUpView() }
            .sheet(isPresented: $showingForgotPassword) { ForgotPasswordView() }
        }
    }

    private func signIn() async {
        isLoading = true
        errorMessage = nil
        do {
            try await SupabaseService.client.auth.signIn(email: email, password: password)
        } catch {
            Haptics.error()
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
