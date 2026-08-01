import SwiftUI

// Mirrors src/components/layout/app-nav.tsx's 3 tabs: Vault / Recalls / Settings.
struct MainTabView: View {
    var body: some View {
        TabView {
            NavigationStack {
                VaultListView()
            }
            .tabItem { Label("Vault", systemImage: "shield") }

            NavigationStack {
                RecallsListView()
            }
            .tabItem { Label("Recalls", systemImage: "exclamationmark.triangle") }

            NavigationStack {
                SettingsListView()
            }
            .tabItem { Label("Settings", systemImage: "gearshape") }
        }
        .tint(.teal)
    }
}
