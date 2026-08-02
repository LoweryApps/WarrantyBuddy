import SwiftUI

struct RecallsListView: View {
    @State private var alerts: [RecallAlert] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    private var active: [RecallAlert] {
        alerts.filter { !$0.acknowledged }.sorted { $0.sortDate > $1.sortDate }
    }
    private var resolved: [RecallAlert] {
        alerts.filter { $0.acknowledged }.sorted { $0.sortDate > $1.sortDate }
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let errorMessage {
                ContentUnavailableView("Couldn't load recalls", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
            } else if alerts.isEmpty {
                ContentUnavailableView("No recall matches", systemImage: "checkmark.shield", description: Text("Buddy checks CPSC, NHTSA, FDA, and USDA once a day."))
            } else {
                List {
                    if !active.isEmpty {
                        Section("Active") {
                            ForEach(active) { alert in
                                RecallAlertRow(alert: alert, onResolve: { await resolve(alert) })
                                    .listRowSeparator(.hidden)
                                    .listRowBackground(Color.clear)
                            }
                        }
                    }
                    if !resolved.isEmpty {
                        Section("Resolved") {
                            ForEach(resolved) { alert in
                                RecallAlertRow(alert: alert, onResolve: nil)
                                    .listRowSeparator(.hidden)
                                    .listRowBackground(Color.clear)
                                    .opacity(0.7)
                            }
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Recalls")
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            let result: [RecallAlert] = try await SupabaseService.client
                .from("user_recall_alerts")
                .select("id, acknowledged, notified_at, recalls(id, source, recall_date, description, remedy, action_url), products(id, name, brand, model_number, category)")
                .order("notified_at", ascending: false)
                .execute()
                .value
            alerts = result
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func resolve(_ alert: RecallAlert) async {
        try? await SupabaseService.client
            .from("user_recall_alerts")
            .update(["acknowledged": true])
            .eq("id", value: alert.id)
            .execute()
        await load()
    }
}

private struct RecallAlertRow: View {
    let alert: RecallAlert
    var onResolve: (() async -> Void)?

    @State private var expanded = false
    @State private var viewingURL: URL?

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Button {
                withAnimation { expanded.toggle() }
            } label: {
                HStack(spacing: Spacing.md) {
                    ZStack {
                        Circle().fill(Color.brandInk.opacity(0.1))
                        Image(systemName: iconName)
                            .font(.subheadline)
                            .foregroundStyle(Color.brandInk)
                    }
                    .frame(width: 36, height: 36)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(alert.products?.name ?? "Unknown product")
                            .font(.brandBody(15, weight: .semibold))
                            .foregroundStyle(.primary)
                        HStack(spacing: Spacing.xs) {
                            if let source = alert.recalls?.source {
                                Text(source).font(.brandBody(10, weight: .bold))
                                    .padding(.horizontal, Spacing.sm).padding(.vertical, 2)
                                    .background(Color.brandInk.opacity(0.1), in: Capsule())
                                    .foregroundStyle(Color.brandInk)
                            }
                            HStack(spacing: 4) {
                                Circle().fill(alert.acknowledged ? Color.brandTeal : Color.brandRed).frame(width: 5, height: 5)
                                Text(alert.acknowledged ? "Resolved" : "Active").font(.brandBody(10, weight: .bold))
                            }
                            .padding(.horizontal, Spacing.sm).padding(.vertical, 2)
                            .background((alert.acknowledged ? Color.brandTeal : Color.brandRed).opacity(0.1), in: Capsule())
                            .foregroundStyle(alert.acknowledged ? Color.brandTeal : Color.brandRed)
                        }
                    }
                    Spacer()
                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if expanded {
                if let description = alert.recalls?.description, !description.isEmpty {
                    Text(description).font(.brandBody(13)).foregroundStyle(.secondary)
                }
                if let remedy = alert.recalls?.remedy, !remedy.isEmpty {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("REMEDY").font(.brandBody(10, weight: .bold)).foregroundStyle(Color.brandAmber)
                        Text(remedy).font(.brandBody(13))
                    }
                }
                HStack(spacing: Spacing.sm) {
                    if let urlString = alert.recalls?.actionUrl, let url = URL(string: urlString) {
                        Button {
                            viewingURL = url
                        } label: {
                            Label("\(alert.recalls?.source ?? "Source") page", systemImage: "arrow.up.right.square")
                        }
                        .font(.brandBody(13))
                        .buttonStyle(.bordered)
                        .tint(.brandInk)
                    }
                    if let onResolve {
                        Button {
                            Haptics.success()
                            Task { await onResolve() }
                        } label: {
                            Label("Mark resolved", systemImage: "checkmark.circle")
                        }
                        .font(.brandBody(13))
                        .buttonStyle(.bordered)
                        .tint(.brandTeal)
                    }
                }
            }
        }
        .cardStyle(padding: Spacing.md, borderColor: alert.acknowledged ? Color(.separator).opacity(0.5) : Color.brandRed.opacity(0.4))
        .sheet(item: $viewingURL) { url in
            SafariView(url: url)
        }
    }

    private var iconName: String {
        switch alert.products?.category {
        case "Electronics": return "tv"
        case "Appliance": return "washer"
        case "Tool": return "wrench.and.screwdriver"
        case "Vehicle": return "car"
        default: return "shippingbox"
        }
    }
}
