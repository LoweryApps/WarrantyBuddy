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
                self.session = session
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
