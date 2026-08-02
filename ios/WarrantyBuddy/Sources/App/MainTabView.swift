import SwiftUI

enum Tab {
    case vault, recalls, settings
}

// Lets BrandHeader's gear icon switch tabs from inside Vault/Recalls,
// without MainTabView needing to own every screen's content directly.
final class TabSelection: ObservableObject {
    @Published var selected: Tab = .vault
}

// Mirrors src/components/layout/app-nav.tsx's 3 tabs: Vault / Recalls / Settings.
struct MainTabView: View {
    @StateObject private var tabSelection = TabSelection()
    @State private var pendingReceiptCount = 0

    var body: some View {
        TabView(selection: $tabSelection.selected) {
            NavigationStack {
                VaultListView(pendingReceiptCount: $pendingReceiptCount)
            }
            .tabItem { Label("Vault", systemImage: "shield.fill") }
            .badge(pendingReceiptCount)
            .tag(Tab.vault)

            NavigationStack {
                RecallsListView()
            }
            .tabItem { Label("Recalls", systemImage: "exclamationmark.triangle.fill") }
            .tag(Tab.recalls)

            NavigationStack {
                SettingsListView()
            }
            .tabItem { Label("Settings", systemImage: "gearshape.fill") }
            .tag(Tab.settings)
        }
        .tint(.brandTeal)
        .environmentObject(tabSelection)
    }
}
