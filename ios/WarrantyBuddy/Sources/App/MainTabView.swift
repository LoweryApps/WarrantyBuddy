import SwiftUI

// Mirrors src/components/layout/app-nav.tsx's 3 tabs: Vault / Recalls / Settings.
struct MainTabView: View {
    @State private var pendingReceiptCount = 0

    var body: some View {
        TabView {
            NavigationStack {
                VaultListView(pendingReceiptCount: $pendingReceiptCount)
            }
            .tabItem { Label("Vault", systemImage: "shield.fill") }
            .badge(pendingReceiptCount)

            NavigationStack {
                RecallsListView()
            }
            .tabItem { Label("Recalls", systemImage: "exclamationmark.triangle.fill") }

            NavigationStack {
                SettingsListView()
            }
            .tabItem { Label("Settings", systemImage: "gearshape.fill") }
        }
        .tint(.brandTeal)
    }
}
