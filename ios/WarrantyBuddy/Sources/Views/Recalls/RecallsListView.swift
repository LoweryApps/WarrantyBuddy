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

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Button {
                withAnimation { expanded.toggle() }
            } label: {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(Color.brandRed)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(alert.products?.name ?? "Unknown product")
                            .font(.brandBody(15, weight: .semibold))
                            .foregroundStyle(.primary)
                        if let source = alert.recalls?.source {
                            Text(source).font(.brandBody(10, weight: .bold))
                                .padding(.horizontal, Spacing.sm).padding(.vertical, 2)
                                .background(Color.brandRed.opacity(0.12), in: Capsule())
                                .foregroundStyle(Color.brandRed)
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
        .cardStyle(padding: Spacing.md)
    }
}
