import SwiftUI

// Root view: mirrors src/proxy.ts's job on the web (route to the auth flow
// vs. the main app based on session state), but as a SwiftUI view switch
// instead of a middleware redirect.
struct AuthGate: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        Group {
            if session.isLoading {
                ProgressView()
            } else if session.session != nil {
                MainTabView()
            } else {
                LoginView()
            }
        }
    }
}
