import SwiftUI

// Mirrors receipt-card.tsx's confirm form.
struct ReceiptReviewView: View {
    let draft: ForwardedReceiptDraft
    var onConfirmed: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var productName: String
    @State private var brand: String
    @State private var retailer: String
    @State private var orderDate: String
    @State private var price: String
    @State private var warrantyStart: String
    @State private var warrantyEnd: String
    @State private var coverage: String
    @State private var exclusions: String
    @State private var claimContact: String

    @State private var existingProducts: [Product] = []
    @State private var selectedExistingProductId: String?

    @State private var isConfirming = false
    @State private var errorMessage: String?

    init(draft: ForwardedReceiptDraft, onConfirmed: @escaping () -> Void) {
        self.draft = draft
        self.onConfirmed = onConfirmed
        _productName = State(initialValue: draft.extractedProductName ?? "")
        _brand = State(initialValue: draft.extractedBrand ?? "")
        _retailer = State(initialValue: draft.extractedRetailer ?? "")
        _orderDate = State(initialValue: draft.extractedOrderDate ?? "")
        _price = State(initialValue: draft.extractedPrice.map { String($0) } ?? "")
        _warrantyStart = State(initialValue: draft.extractedWarrantyStartDate ?? "")
        _warrantyEnd = State(initialValue: draft.extractedWarrantyEndDate ?? "")
        _coverage = State(initialValue: draft.extractedCoverageDescription ?? "")
        _exclusions = State(initialValue: draft.extractedExclusions ?? "")
        _claimContact = State(initialValue: draft.extractedClaimContact ?? "")
    }

    var body: some View {
        Form {
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(.red)
            }

            Section("Link to a product") {
                Picker("Existing product", selection: $selectedExistingProductId) {
                    Text("Create a new product").tag(String?.none)
                    ForEach(existingProducts) { p in
                        Text(p.name).tag(String?.some(p.id))
                    }
                }
            }

            if selectedExistingProductId == nil {
                Section("Product details") {
                    TextField("Product name", text: $productName)
                    TextField("Brand", text: $brand)
                    TextField("Retailer", text: $retailer)
                    TextField("Order date (YYYY-MM-DD)", text: $orderDate)
                    TextField("Price", text: $price).keyboardType(.decimalPad)
                }
            }

            if draft.isWarranty {
                Section("Warranty details") {
                    TextField("Start date (YYYY-MM-DD)", text: $warrantyStart)
                    TextField("End date (YYYY-MM-DD)", text: $warrantyEnd)
                    TextField("Coverage", text: $coverage, axis: .vertical)
                    TextField("Exclusions", text: $exclusions, axis: .vertical)
                    TextField("Claim contact", text: $claimContact)
                }
            }

            Section {
                Button {
                    Task { await confirm() }
                } label: {
                    if isConfirming {
                        ProgressView()
                    } else {
                        Text("Confirm").bold()
                    }
                }
                .disabled(isConfirming || (selectedExistingProductId == nil && productName.trimmingCharacters(in: .whitespaces).isEmpty))
            }
        }
        .navigationTitle("Review")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadExistingProducts() }
    }

    private func loadExistingProducts() async {
        existingProducts = (try? await SupabaseService.client
            .from("products").select().order("created_at", ascending: false).execute().value) ?? []
    }

    private func confirm() async {
        isConfirming = true
        errorMessage = nil
        do {
            let payload = ConfirmReceiptPayload(
                draftId: draft.id,
                productId: selectedExistingProductId,
                productName: productName,
                brand: brand,
                retailer: retailer,
                orderDate: orderDate,
                price: price,
                warrantyStart: warrantyStart,
                warrantyEnd: warrantyEnd,
                coverage: coverage,
                exclusions: exclusions,
                claimContact: claimContact
            )
            try await APIClient.confirmReceipt(payload)
            onConfirmed()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isConfirming = false
    }
}
