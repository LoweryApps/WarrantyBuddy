import SwiftUI

@main
struct WarrantyBuddyApp: App {
    @StateObject private var session = SessionStore()

    init() {
        BrandFonts.registerAll()
    }

    var body: some Scene {
        WindowGroup {
            AuthGate()
                .environmentObject(session)
                .tint(.brandTeal)
                .font(.brandBody(17))
                .onAppear { session.start() }
        }
    }
}
