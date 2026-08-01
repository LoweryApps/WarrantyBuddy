import SwiftUI

@main
struct WarrantyBuddyApp: App {
    @StateObject private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            AuthGate()
                .environmentObject(session)
                .onAppear { session.start() }
        }
    }
}
