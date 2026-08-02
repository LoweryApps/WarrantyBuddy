import SwiftUI

struct VaultListView: View {
    @EnvironmentObject private var session: SessionStore
    @Binding var pendingReceiptCount: Int
    @State private var products: [ProductWithWarranties] = []
    @State private var recalledProductIds: Set<String> = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showingAdd = false

    private let columns = [GridItem(.flexible(), spacing: Spacing.md), GridItem(.flexible(), spacing: Spacing.md)]

    init(pendingReceiptCount: Binding<Int> = .constant(0)) {
        self._pendingReceiptCount = pendingReceiptCount
    }

    var body: some View {
        VStack(spacing: 0) {
            BrandHeader()

            Group {
                if isLoading {
                    ProgressView().frame(maxHeight: .infinity)
                } else if let errorMessage {
                    ContentUnavailableView("Couldn't load your vault", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
                        .frame(maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: Spacing.lg) {
                            HStack {
                                Text("Your vault").font(.brandDisplay(26))
                                Spacer()
                                Button {
                                    showingAdd = true
                                } label: {
                                    Label("Add product", systemImage: "plus").font(.brandBody(12, weight: .semibold))
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.brandNavy)
                                .controlSize(.small)
                            }

                            if pendingReceiptCount > 0 {
                                NavigationLink(value: ReceiptBannerDestination()) {
                                    ReceiptBanner(count: pendingReceiptCount)
                                }
                            }

                            if !products.isEmpty {
                                StatRow(products: products, recallCount: recalledProductIds.count)
                            }

                            if products.isEmpty {
                                ContentUnavailableView("No products yet", systemImage: "shield", description: Text("Tap + to add your first product."))
                                    .frame(maxWidth: .infinity)
                                    .padding(.top, Spacing.xl)
                            } else {
                                LazyVGrid(columns: columns, spacing: Spacing.md) {
                                    ForEach(products) { item in
                                        NavigationLink(value: item) {
                                            VaultCard(item: item, isRecalled: recalledProductIds.contains(item.id))
                                        }
                                        .buttonStyle(.plain)
                                        .contextMenu {
                                            Button(role: .destructive) {
                                                Task { await delete(item) }
                                            } label: {
                                                Label("Delete", systemImage: "trash")
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        .padding(Spacing.lg)
                    }
                    .refreshable { await load() }
                    .navigationDestination(for: ProductWithWarranties.self) { item in
                        ProductDetailView(item: item, onChanged: { Task { await load() } })
                    }
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: ReceiptBannerDestination.self) { _ in
            ReceiptQueueView()
        }
        .sheet(isPresented: $showingAdd) {
            AddProductView { Task { await load() } }
        }
        .task { await load() }
    }

    private func delete(_ item: ProductWithWarranties) async {
        withAnimation { products.removeAll { $0.id == item.id } }
        try? await SupabaseService.client.from("products").delete().eq("id", value: item.id).execute()
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

// Mirrors src/components/dashboard/product-card.tsx's stats grid (Products /
// Active Warranties / Expiring Soon / Recall Alerts), all computed
// client-side from data already fetched by VaultListView.load().
private struct StatRow: View {
    let products: [ProductWithWarranties]
    let recallCount: Int

    private var activeWarranties: Int {
        products.filter { item in
            guard let status = item.primaryWarranty.map({ WarrantyStatus.compute(endDate: $0.endDate) }) else { return false }
            return status == .active || status == .expiring
        }.count
    }

    private var expiringSoon: Int {
        products.filter { item in
            item.primaryWarranty.map({ WarrantyStatus.compute(endDate: $0.endDate) }) == .expiring
        }.count
    }

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: Spacing.md), GridItem(.flexible(), spacing: Spacing.md)], spacing: Spacing.md) {
            StatCard(title: "PRODUCTS", value: "\(products.count)", caption: "in your vault", color: .primary)
            StatCard(title: "ACTIVE WARRANTIES", value: "\(activeWarranties)", caption: "covered", color: .brandTeal)
            StatCard(title: "EXPIRING SOON", value: "\(expiringSoon)", caption: "within 60 days", color: .brandAmber)
            StatCard(title: "RECALL ALERTS", value: "\(recallCount)", caption: "needs action", color: .brandRed)
        }
    }
}

private struct StatCard: View {
    let title: String
    let value: String
    let caption: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.brandBody(9, weight: .semibold)).foregroundStyle(.secondary)
            Text(value).font(.brandDisplay(24)).foregroundStyle(color)
            Text(caption).font(.brandBody(10)).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle(padding: Spacing.md)
    }
}

// Mirrors src/lib/warranty.ts's WarrantyStatus/warrantyStatus/formatDateLabel.
private enum WarrantyStatus {
    case active, expiring, expired, noWarranty

    static func compute(endDate: String?) -> WarrantyStatus {
        guard let endDate, let date = parseDateOnly(endDate) else { return .active }
        let days = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: date).day ?? 0
        if days < 0 { return .expired }
        if days <= 60 { return .expiring }
        return .active
    }

    static func parseDateOnly(_ string: String) -> Date? {
        let parts = string.prefix(10).split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var components = DateComponents()
        components.year = parts[0]; components.month = parts[1]; components.day = parts[2]
        return Calendar.current.date(from: components)
    }

    static func monthYearLabel(_ dateString: String) -> String {
        guard let date = parseDateOnly(dateString) else { return dateString }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM yyyy"
        return formatter.string(from: date)
    }

    var label: String {
        switch self {
        case .active: return "Active"
        case .expiring: return "Expiring"
        case .expired: return "Expired"
        case .noWarranty: return "No warranty"
        }
    }

    var icon: String? {
        switch self {
        case .active: return "checkmark"
        case .expiring: return "clock"
        case .expired: return "xmark"
        case .noWarranty: return nil
        }
    }

    var color: Color {
        switch self {
        case .active: return .brandTeal
        case .expiring: return .brandAmber
        case .expired: return .brandRed
        case .noWarranty: return .brandInk
        }
    }
}

// Mirrors product-card.tsx exactly: icon+badge row, name, brand/model,
// divider, then a footer line (expiration label, plus a recall/expiring
// indicator on the right).
private struct VaultCard: View {
    let item: ProductWithWarranties
    var isRecalled: Bool = false

    private var status: WarrantyStatus {
        item.primaryWarranty.map { WarrantyStatus.compute(endDate: $0.endDate) } ?? .noWarranty
    }

    private var dateLabel: String {
        guard let warranty = item.primaryWarranty else { return "Added manually" }
        guard let endDate = warranty.endDate else { return "No expiration on file" }
        let monthYear = WarrantyStatus.monthYearLabel(endDate)
        return status == .expired ? "Expired \(monthYear)" : "Expires \(monthYear)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                ZStack {
                    Circle().fill(Color.brandInk.opacity(0.1))
                    Image(systemName: iconName).font(.subheadline).foregroundStyle(Color.brandInk)
                }
                .frame(width: 34, height: 34)
                Spacer()
                StatusBadge(status: status)
            }
            .padding(.bottom, Spacing.sm)

            Text(item.name)
                .font(.brandBody(12, weight: .medium))
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text([item.brand, item.modelNumber].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ").isEmpty ? "—" : [item.brand, item.modelNumber].compactMap { $0 }.joined(separator: " · "))
                .font(.brandBody(10))
                .foregroundStyle(Color.brandInk)
                .lineLimit(1)

            Divider().padding(.vertical, Spacing.sm)

            HStack {
                Text(dateLabel).font(.brandBody(10)).foregroundStyle(Color.brandInk)
                Spacer()
                if isRecalled {
                    Label("Recall", systemImage: "exclamationmark.triangle.fill")
                        .font(.brandBody(10, weight: .medium))
                        .foregroundStyle(Color.brandRed)
                        .labelStyle(.titleAndIcon)
                } else if status == .expiring {
                    Text("Expiring soon").font(.brandBody(10)).foregroundStyle(Color.brandAmber)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
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

private struct StatusBadge: View {
    let status: WarrantyStatus

    var body: some View {
        HStack(spacing: 3) {
            if let icon = status.icon {
                Image(systemName: icon).font(.system(size: 8, weight: .bold))
            }
            Text(status.label).font(.brandBody(10, weight: .semibold))
        }
        .padding(.horizontal, Spacing.sm).padding(.vertical, 3)
        .background(status.color.opacity(status == .noWarranty ? 0.1 : 0.15), in: Capsule())
        .foregroundStyle(status.color)
    }
}
