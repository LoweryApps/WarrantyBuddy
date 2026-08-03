import SwiftUI

struct ProductDetailView: View {
    let item: ProductWithWarranties
    var onChanged: () -> Void = {}

    @Environment(\.dismiss) private var dismiss
    @State private var showingEdit = false
    @State private var showingDeleteConfirm = false
    @State private var showingClaimAssist = false
    @State private var showingWarrantyEdit = false
    @State private var showingAskBuddy = false

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

            Section {
                if let warranty = item.primaryWarranty {
                    row("Type", warranty.warrantyType)
                    row("Start date", warranty.startDate)
                    row("End date", warranty.endDate)
                    if let coverage = warranty.coverageDescription, !coverage.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("What's covered").font(.brandBody(11)).foregroundStyle(.secondary)
                            Text(coverage).font(.brandBody(14))
                        }
                    }
                    if let exclusions = warranty.exclusions, !exclusions.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("What's not covered").font(.brandBody(11)).foregroundStyle(.secondary)
                            Text(exclusions).font(.brandBody(14))
                        }
                    }
                    if let claimContact = warranty.claimContact, !claimContact.isEmpty {
                        row("Claim contact", claimContact)
                    }
                    Button {
                        showingWarrantyEdit = true
                    } label: {
                        Label("Edit warranty details", systemImage: "pencil")
                    }
                } else {
                    Text("No warranty on file yet").font(.brandBody(13)).foregroundStyle(.secondary)
                    Button {
                        showingWarrantyEdit = true
                    } label: {
                        Label("Add warranty", systemImage: "plus")
                    }
                }
            } header: {
                Label("Warranty", systemImage: "checkmark.shield")
            }

            DocumentsSection(productId: item.id)

            Section {
                Button {
                    showingClaimAssist = true
                } label: {
                    Label("File a claim", systemImage: "sparkles")
                }
                .foregroundStyle(Color.brandTeal)

                Button {
                    showingAskBuddy = true
                } label: {
                    Label("Ask Buddy", systemImage: "bubble.left.and.bubble.right")
                }
                .foregroundStyle(Color.brandTeal)
            }

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
        .sheet(isPresented: $showingClaimAssist) {
            ClaimAssistView(productId: item.id, productName: item.name)
        }
        .sheet(isPresented: $showingWarrantyEdit) {
            WarrantyEditView(
                productId: item.id,
                productBrand: item.brand,
                purchaseDate: item.purchaseDate,
                existing: item.primaryWarranty
            ) {
                onChanged()
            }
        }
        .sheet(isPresented: $showingAskBuddy) {
            AskBuddyView(mode: .product(
                id: item.id,
                name: item.name,
                status: item.primaryWarranty.map { WarrantyStatus.compute(endDate: $0.endDate) } ?? .noWarranty
            ))
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
