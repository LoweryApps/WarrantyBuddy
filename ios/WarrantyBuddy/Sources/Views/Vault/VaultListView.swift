import SwiftUI

struct VaultListView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var products: [ProductWithWarranties] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if let errorMessage {
                    ContentUnavailableView("Couldn't load your vault", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
                } else if products.isEmpty {
                    ContentUnavailableView("No products yet", systemImage: "shield", description: Text("Products you add on the web will show up here."))
                } else {
                    List(products) { item in
                        NavigationLink(value: item) {
                            VaultRow(item: item)
                        }
                    }
                    .navigationDestination(for: ProductWithWarranties.self) { item in
                        ProductDetailView(item: item)
                    }
                }
            }
            .navigationTitle("Your vault")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Sign out") {
                        Task { try? await SupabaseService.client.auth.signOut() }
                    }
                }
            }
            .task { await load() }
            .refreshable { await load() }
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
        isLoading = false
    }
}

private struct VaultRow: View {
    let item: ProductWithWarranties

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconName)
                .font(.title3)
                .foregroundStyle(Color.teal)
                .frame(width: 32)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name).font(.subheadline).bold()
                if let brand = item.brand, !brand.isEmpty {
                    Text([brand, item.modelNumber].compactMap { $0 }.joined(separator: " · "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if let warranty = item.primaryWarranty {
                WarrantyPill(warranty: warranty)
            }
        }
        .padding(.vertical, 4)
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

private struct WarrantyPill: View {
    let warranty: Warranty

    var body: some View {
        Text(label)
            .font(.caption2).bold()
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(color.opacity(0.15), in: Capsule())
            .foregroundStyle(color)
    }

    private var isExpired: Bool {
        guard let endDate = warranty.endDate else { return false }
        return endDate < isoToday
    }

    private var isoToday: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    private var label: String { isExpired ? "Expired" : "Active" }
    private var color: Color { isExpired ? .red : .teal }
}
