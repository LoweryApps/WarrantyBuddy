import SwiftUI

struct VaultListView: View {
    @EnvironmentObject private var session: SessionStore
    @Binding var pendingReceiptCount: Int
    @State private var products: [ProductWithWarranties] = []
    @State private var recalledProductIds: Set<String> = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showingAdd = false

    init(pendingReceiptCount: Binding<Int> = .constant(0)) {
        self._pendingReceiptCount = pendingReceiptCount
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let errorMessage {
                ContentUnavailableView("Couldn't load your vault", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
            } else if products.isEmpty {
                VStack {
                    if pendingReceiptCount > 0 {
                        NavigationLink(value: ReceiptBannerDestination()) {
                            ReceiptBanner(count: pendingReceiptCount)
                        }
                        .padding()
                    }
                    ContentUnavailableView("No products yet", systemImage: "shield", description: Text("Tap + to add your first product."))
                }
            } else {
                List {
                    if pendingReceiptCount > 0 {
                        NavigationLink(value: ReceiptBannerDestination()) {
                            ReceiptBanner(count: pendingReceiptCount)
                        }
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                    ForEach(products) { item in
                        NavigationLink(value: item) {
                            VaultRow(item: item, isRecalled: recalledProductIds.contains(item.id))
                        }
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets(top: Spacing.xs, leading: Spacing.lg, bottom: Spacing.xs, trailing: Spacing.lg))
                    }
                    .onDelete { offsets in
                        Task { await delete(at: offsets) }
                    }
                }
                .listStyle(.plain)
                .navigationDestination(for: ProductWithWarranties.self) { item in
                    ProductDetailView(item: item, onChanged: { Task { await load() } })
                }
            }
        }
        .navigationTitle("Your vault")
        .navigationDestination(for: ReceiptBannerDestination.self) { _ in
            ReceiptQueueView()
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingAdd = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingAdd) {
            AddProductView { Task { await load() } }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func delete(at offsets: IndexSet) async {
        let idsToDelete = offsets.map { products[$0].id }
        withAnimation { products.remove(atOffsets: offsets) }
        for id in idsToDelete {
            try? await SupabaseService.client.from("products").delete().eq("id", value: id).execute()
        }
    }

    private func load() async {
        guard let userId = session.userId else { return }
        isLoading = true
        errorMessage = nil
        do {
            let result: [ProductWithWarranties] = try await SupabaseService.client
                .from("products")
                .select("*, warranties(*)")
                .eq("user_id", value: userId)
                .order("created_at", ascending: false)
                .execute()
                .value
            products = result
        } catch {
            errorMessage = error.localizedDescription
        }

        let count = try? await SupabaseService.client
            .from("forwarded_receipts")
            .select("id", head: true, count: .exact)
            .eq("status", value: "Pending Review")
            .execute()
            .count
        pendingReceiptCount = count ?? 0

        let recallRows: [RecalledProductId]? = try? await SupabaseService.client
            .from("user_recall_alerts")
            .select("product_id")
            .eq("acknowledged", value: false)
            .execute()
            .value
        recalledProductIds = Set((recallRows ?? []).map { $0.productId })

        isLoading = false
    }
}

private struct RecalledProductId: Codable {
    let productId: String
    enum CodingKeys: String, CodingKey { case productId = "product_id" }
}

// Hashable placeholder for NavigationLink(value:) — the destination screen
// doesn't need any data, it fetches its own.
struct ReceiptBannerDestination: Hashable {}

// Mirrors receipt-banner.tsx.
struct ReceiptBanner: View {
    let count: Int

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "text.bubble.fill")
                .foregroundStyle(Color.brandTeal)
            VStack(alignment: .leading, spacing: 2) {
                Text("\(count) receipt\(count == 1 ? "" : "s") waiting for review")
                    .font(.brandBody(13, weight: .semibold)).foregroundStyle(Color.brandTeal)
                Text("Buddy read your forwarded emails and is ready to confirm")
                    .font(.brandBody(11)).foregroundStyle(Color.brandTeal.opacity(0.8))
            }
            Spacer()
            Image(systemName: "chevron.right").font(.caption).foregroundStyle(Color.brandTeal)
        }
        .padding(Spacing.md)
        .background(Color.brandTeal.opacity(0.1), in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Color.brandTeal.opacity(0.4)))
    }
}

private struct VaultRow: View {
    let item: ProductWithWarranties
    var isRecalled: Bool = false

    var body: some View {
        HStack(spacing: Spacing.md) {
            ZStack {
                Circle().fill(Color.brandInk.opacity(0.1))
                Image(systemName: iconName)
                    .font(.title3)
                    .foregroundStyle(Color.brandInk)
            }
            .frame(width: 44, height: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name).font(.brandBody(15, weight: .semibold)).foregroundStyle(.primary)
                if let brand = item.brand, !brand.isEmpty {
                    Text([brand, item.modelNumber].compactMap { $0 }.joined(separator: " · "))
                        .font(.brandBody(12))
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            WarrantyPill(warranty: item.primaryWarranty)
        }
        .cardStyle(padding: Spacing.md, borderColor: isRecalled ? Color.brandRed.opacity(0.4) : Color(.separator).opacity(0.5))
    }

    private var iconName: String {
        switch item.category {
        case "Electronics": return "tv"
        case "Appliance": return "washer"
        case "Tool": return "wrench.and.screwdriver"
        case "Vehicle": return "car"
        default: return "shippingbox"
        }
    }
}

// Mirrors the web's status badge: teal "Active", red "Expired", ink "No warranty".
private struct WarrantyPill: View {
    let warranty: Warranty?

    var body: some View {
        Text(label)
            .font(.brandBody(11, weight: .semibold))
            .padding(.horizontal, Spacing.sm).padding(.vertical, 3)
            .background(color.opacity(warranty == nil ? 0.1 : 0.15), in: Capsule())
            .foregroundStyle(color)
    }

    private var isExpired: Bool {
        guard let endDate = warranty?.endDate else { return false }
        return endDate < isoToday
    }

    private var isoToday: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    private var label: String {
        guard warranty != nil else { return "No warranty" }
        return isExpired ? "Expired" : "Active"
    }

    private var color: Color {
        guard warranty != nil else { return .brandInk }
        return isExpired ? .brandRed : .brandTeal
    }
}
