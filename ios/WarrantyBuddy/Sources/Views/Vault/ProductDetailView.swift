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
                    ZStack {
                        Circle().fill(Color.brandInk.opacity(0.1))
                        Image(systemName: categoryIcon)
                            .font(.title2)
                            .foregroundStyle(Color.brandInk)
                    }
                    .frame(width: 52, height: 52)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.name).font(.brandDisplay(17))
                        if let warranty = item.primaryWarranty {
                            Text(warranty.warrantyType).font(.brandBody(12)).foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    ReadinessBadge(result: readiness)
                }
                .padding(.vertical, 4)
            }

            Section {
                row("Brand", item.brand)
                row("Model number", item.modelNumber)
                row("Serial number", item.serialNumber)
                row("Category", item.category)
                row("Room / location", item.roomLocation)
                row("Quantity", String(item.quantity))
            } header: {
                Label("Product details", systemImage: "shippingbox")
            }

            Section {
                row("Purchase date", item.purchaseDate)
                row("Purchase price", item.purchasePrice.map { String(format: "$%.2f", $0) })
                row("Retailer", item.retailer)
            } header: {
                Label("Purchase details", systemImage: "cart")
            }

            if let warranty = item.primaryWarranty {
                Section {
                    row("Type", warranty.warrantyType)
                    row("Start date", warranty.startDate)
                    row("End date", warranty.endDate)
                    if let coverage = warranty.coverageDescription, !coverage.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Coverage").font(.brandBody(11)).foregroundStyle(.secondary)
                            Text(coverage).font(.brandBody(14))
                        }
                    }
                } header: {
                    Label("Warranty", systemImage: "checkmark.shield")
                }
            }

            DocumentsSection(productId: item.id)

            Section {
                Button(role: .destructive) {
                    Haptics.light()
                    showingDeleteConfirm = true
                } label: {
                    Label("Delete product", systemImage: "trash")
                        .foregroundStyle(Color.brandRed)
                }
            }
        }
        .tint(.brandTeal)
        .navigationTitle(item.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingEdit = true
                } label: {
                    Label("Edit", systemImage: "pencil")
                }
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
        Haptics.success()
        onChanged()
        dismiss()
    }

    private var categoryIcon: String {
        switch item.category {
        case "Electronics": return "tv"
        case "Appliance": return "washer"
        case "Tool": return "wrench.and.screwdriver"
        case "Vehicle": return "car"
        default: return "shippingbox"
        }
    }

    @ViewBuilder
    private func row(_ label: String, _ value: String?) -> some View {
        HStack {
            Text(label).font(.brandBody(14)).foregroundStyle(.secondary)
            Spacer()
            Text((value?.isEmpty ?? true) ? "—" : value!)
                .font(.brandBody(14, weight: .medium))
                .multilineTextAlignment(.trailing)
        }
    }
}

private struct ReadinessBadge: View {
    let result: ClaimReadinessResult

    var body: some View {
        VStack(spacing: 2) {
            Text("\(result.score)").font(.brandDisplay(17)).foregroundStyle(color)
            Text(result.band.rawValue).font(.brandBody(9, weight: .semibold)).foregroundStyle(.secondary)
        }
        .padding(10)
        .background(color.opacity(0.1), in: Circle())
    }

    private var color: Color {
        switch result.band {
        case .claimReady: return .brandTeal
        case .almostThere: return .brandAmber
        case .needsAttention: return .brandRed
        }
    }
}
