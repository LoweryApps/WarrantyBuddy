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
                VStack(spacing: 20) {
                    VStack(spacing: 6) {
                        Text("Warranty")
                            .font(.system(size: 26, weight: .bold, design: .rounded))
                            .foregroundStyle(.primary)
                        + Text("Buddy")
                            .font(.system(size: 26, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.teal)
                        Text("Welcome back")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 24)

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .padding(10)
                            .frame(maxWidth: .infinity)
                            .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
                    }

                    VStack(alignment: .leading, spacing: 14) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Email address").font(.caption).foregroundStyle(.secondary)
                            TextField("alex@example.com", text: $email)
                                .textFieldStyle(.roundedBorder)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Password").font(.caption).foregroundStyle(.secondary)
                            SecureField("••••••••••••", text: $password)
                                .textFieldStyle(.roundedBorder)
                        }
                        Button("Forgot password?") { showingForgotPassword = true }
                            .font(.footnote)
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
                    .tint(.teal)
                    .controlSize(.large)
                    .disabled(email.isEmpty || password.isEmpty || isLoading)

                    Button("Don't have an account? Sign up free") { showingSignUp = true }
                        .font(.footnote)
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
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
