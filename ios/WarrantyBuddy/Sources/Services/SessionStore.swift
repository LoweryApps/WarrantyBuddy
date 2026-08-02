import Foundation
import Supabase

@MainActor
final class SessionStore: ObservableObject {
    @Published var session: Session?
    @Published var isLoading = true

    private var authTask: Task<Void, Never>?

    func start() {
        authTask = Task {
            for await (_, session) in SupabaseService.client.auth.authStateChanges {
                // With emitLocalSessionAsInitialSession enabled, the initial session is
                // emitted before a refresh is attempted, so it may already be expired.
                // A tokenRefreshed event follows shortly after if it can be renewed.
                self.session = session?.isExpired == true ? nil : session
                self.isLoading = false
            }
        }
    }

    func stop() {
        authTask?.cancel()
    }

    var userId: String? {
        session?.user.id.uuidString.lowercased()
    }
}
