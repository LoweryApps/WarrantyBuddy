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
                            }
                        }
                    }
                    if !resolved.isEmpty {
                        Section("Resolved") {
                            ForEach(resolved) { alert in
                                RecallAlertRow(alert: alert, onResolve: nil)
                            }
                        }
                    }
                }
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
        VStack(alignment: .leading, spacing: 6) {
            Button {
                withAnimation { expanded.toggle() }
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(alert.products?.name ?? "Unknown product").font(.subheadline).bold()
                            .foregroundStyle(.primary)
                        if let source = alert.recalls?.source {
                            Text(source).font(.caption2).bold()
                                .padding(.horizontal, 6).padding(.vertical, 2)
                                .background(Color.red.opacity(0.12), in: Capsule())
                                .foregroundStyle(.red)
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
                    Text(description).font(.footnote).foregroundStyle(.secondary)
                }
                if let remedy = alert.recalls?.remedy, !remedy.isEmpty {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("REMEDY").font(.caption2).bold().foregroundStyle(.orange)
                        Text(remedy).font(.footnote)
                    }
                }
                if let onResolve {
                    Button("Mark resolved") { Task { await onResolve() } }
                        .font(.footnote)
                        .buttonStyle(.bordered)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
