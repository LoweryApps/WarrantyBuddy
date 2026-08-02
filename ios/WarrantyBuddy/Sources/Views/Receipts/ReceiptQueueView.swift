import SwiftUI

// Mirrors src/app/(app)/receipts/page.tsx + receipt-queue-view.tsx.
struct ReceiptQueueView: View {
    @State private var pending: [ForwardedReceiptDraft] = []
    @State private var discarded: [ForwardedReceiptDraft] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let errorMessage {
                ContentUnavailableView("Couldn't load receipts", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
            } else if pending.isEmpty && discarded.isEmpty {
                ContentUnavailableView("Nothing to review", systemImage: "tray", description: Text("Forwarded receipts and warranty emails will show up here."))
            } else {
                List {
                    if !pending.isEmpty {
                        Section("Pending review") {
                            ForEach(pending) { draft in
                                NavigationLink(value: draft) {
                                    ReceiptDraftRow(draft: draft)
                                }
                                .swipeActions {
                                    Button("Discard", role: .destructive) {
                                        Task { await discard(draft) }
                                    }
                                }
                            }
                        }
                    }
                    if !discarded.isEmpty {
                        Section("Recently discarded") {
                            ForEach(discarded) { draft in
                                HStack {
                                    ReceiptDraftRow(draft: draft)
                                    Spacer()
                                    Button {
                                        Task { await restore(draft) }
                                    } label: {
                                        Label("Restore", systemImage: "arrow.uturn.backward")
                                    }
                                    .font(.brandBody(12))
                                    .tint(.brandTeal)
                                }
                                .opacity(0.7)
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .navigationDestination(for: ForwardedReceiptDraft.self) { draft in
                    ReceiptReviewView(draft: draft, onConfirmed: { Task { await load() } })
                }
            }
        }
        .navigationTitle("Receipts")
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            async let pendingResult: [ForwardedReceiptDraft] = SupabaseService.client
                .from("forwarded_receipts").select()
                .eq("status", value: "Pending Review")
                .order("received_at", ascending: false)
                .execute().value

            let thirtyDaysAgo = ISO8601DateFormatter().string(from: Date().addingTimeInterval(-30 * 86400))
            async let discardedResult: [ForwardedReceiptDraft] = SupabaseService.client
                .from("forwarded_receipts").select()
                .eq("status", value: "Discarded")
                .gte("discarded_at", value: thirtyDaysAgo)
                .order("discarded_at", ascending: false)
                .execute().value

            pending = try await pendingResult
            discarded = try await discardedResult
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func discard(_ draft: ForwardedReceiptDraft) async {
        try? await SupabaseService.client
            .from("forwarded_receipts")
            .update(["status": "Discarded", "discarded_at": ISO8601DateFormatter().string(from: Date())])
            .eq("id", value: draft.id)
            .execute()
        await load()
    }

    private func restore(_ draft: ForwardedReceiptDraft) async {
        try? await SupabaseService.client
            .from("forwarded_receipts")
            .update(["status": "Pending Review", "discarded_at": nil] as [String: String?])
            .eq("id", value: draft.id)
            .execute()
        await load()
    }
}

private struct ReceiptDraftRow: View {
    let draft: ForwardedReceiptDraft

    var body: some View {
        HStack(spacing: Spacing.md) {
            ZStack {
                Circle().fill(Color.brandTeal.opacity(0.12))
                Image(systemName: draft.isWarranty ? "checkmark.shield" : "receipt")
                    .foregroundStyle(Color.brandTeal)
                    .font(.footnote)
            }
            .frame(width: 32, height: 32)
            VStack(alignment: .leading, spacing: 2) {
                Text(draft.extractedProductName ?? draft.sourceEmailSubject ?? "Forwarded email")
                    .font(.brandBody(14, weight: .semibold))
                HStack(spacing: 4) {
                    if let brand = draft.extractedBrand { Text(brand) }
                    if let retailer = draft.extractedRetailer { Text("· \(retailer)") }
                    if draft.isWarranty { Text("· Warranty").foregroundStyle(Color.brandTeal) }
                }
                .font(.brandBody(11)).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}
