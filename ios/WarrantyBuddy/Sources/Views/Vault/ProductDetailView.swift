import SwiftUI

struct ProductDetailView: View {
    let item: ProductWithWarranties
    var onChanged: () -> Void = {}

    @Environment(\.dismiss) private var dismiss
    @State private var showingEdit = false
    @State private var showingDeleteConfirm = false

    private var readiness: ClaimReadinessResult {
        ClaimReadiness.compute(
            hasReceipt: item.warranties.contains { $0.documentUrl != nil },
            purchaseDate: item.purchaseDate,
            serialNumber: item.serialNumber
        )
    }

    var body: some View {
        Form {
            Section {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.name).font(.headline)
                        if let warranty = item.primaryWarranty {
                            Text(warranty.warrantyType).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    ReadinessBadge(result: readiness)
                }
                .padding(.vertical, 4)
            }

            Section("Product details") {
                row("Brand", item.brand)
                row("Model number", item.modelNumber)
                row("Serial number", item.serialNumber)
                row("Category", item.category)
                row("Room / location", item.roomLocation)
                row("Quantity", String(item.quantity))
            }

            Section("Purchase details") {
                row("Purchase date", item.purchaseDate)
                row("Purchase price", item.purchasePrice.map { String(format: "$%.2f", $0) })
                row("Retailer", item.retailer)
            }

            if let warranty = item.primaryWarranty {
                Section("Warranty") {
                    row("Type", warranty.warrantyType)
                    row("Start date", warranty.startDate)
                    row("End date", warranty.endDate)
                    if let coverage = warranty.coverageDescription, !coverage.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Coverage").font(.caption).foregroundStyle(.secondary)
                            Text(coverage).font(.subheadline)
                        }
                    }
                }
            }

            Section {
                Button("Delete product", role: .destructive) {
                    showingDeleteConfirm = true
                }
            }
        }
        .navigationTitle(item.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Edit") { showingEdit = true }
            }
        }
        .sheet(isPresented: $showingEdit) {
            NavigationStack {
                ProductFormView(mode: .edit(productId: item.id), initialDraft: .from(item.product)) {
                    showingEdit = false
                    onChanged()
                    dismiss()
                }
            }
        }
        .confirmationDialog("Delete this product?", isPresented: $showingDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                Task { await deleteProduct() }
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    private func deleteProduct() async {
        try? await SupabaseService.client.from("products").delete().eq("id", value: item.id).execute()
        onChanged()
        dismiss()
    }

    @ViewBuilder
    private func row(_ label: String, _ value: String?) -> some View {
        HStack {
            Text(label).foregroundStyle(.secondary)
            Spacer()
            Text((value?.isEmpty ?? true) ? "—" : value!)
                .multilineTextAlignment(.trailing)
        }
    }
}

private struct ReadinessBadge: View {
    let result: ClaimReadinessResult

    var body: some View {
        VStack(spacing: 2) {
            Text("\(result.score)").font(.title3).bold().foregroundStyle(color)
            Text(result.band.rawValue).font(.caption2).foregroundStyle(.secondary)
        }
        .padding(10)
        .background(color.opacity(0.1), in: Circle())
    }

    private var color: Color {
        switch result.band {
        case .claimReady: return .teal
        case .almostThere: return .orange
        case .needsAttention: return .red
        }
    }
}
