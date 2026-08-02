import SwiftUI

enum ProductFormMode {
    case create
    case edit(productId: String)
}

struct ProductFormView: View {
    @EnvironmentObject private var session: SessionStore
    let mode: ProductFormMode
    @State var draft: ProductDraft
    var onSaved: () -> Void

    @State private var isSaving = false
    @State private var errorMessage: String?

    init(mode: ProductFormMode, initialDraft: ProductDraft, onSaved: @escaping () -> Void) {
        self.mode = mode
        self._draft = State(initialValue: initialDraft)
        self.onSaved = onSaved
    }

    var body: some View {
        Form {
            if let errorMessage {
                ErrorBanner(message: errorMessage)
            }

            Section {
                TextField("Name", text: $draft.name)
                TextField("Brand", text: $draft.brand)
                TextField("Model number", text: $draft.modelNumber)
                TextField("Serial number", text: $draft.serialNumber)
                Picker("Category", selection: $draft.category) {
                    ForEach(productCategories, id: \.self) { Text($0) }
                }
                TextField("Room / location", text: $draft.roomLocation)
                TextField("Quantity", text: $draft.quantity).keyboardType(.numberPad)
            } header: {
                Label("Product details", systemImage: "shippingbox")
            }

            Section {
                Toggle("Has a purchase date", isOn: Binding(
                    get: { draft.purchaseDate != nil },
                    set: { hasDate in
                        withAnimation { draft.purchaseDate = hasDate ? (draft.purchaseDate ?? Date()) : nil }
                    }
                ))
                if let date = draft.purchaseDate {
                    DatePicker("Purchase date", selection: Binding(
                        get: { date },
                        set: { draft.purchaseDate = $0 }
                    ), displayedComponents: .date)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
                TextField("Purchase price", text: $draft.purchasePrice).keyboardType(.decimalPad)
                TextField("Retailer", text: $draft.retailer)
            } header: {
                Label("Purchase details", systemImage: "cart")
            }
        }
        .tint(.brandTeal)
        .navigationTitle(draft.name.isEmpty ? "New product" : draft.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                if isSaving {
                    ProgressView()
                } else {
                    Button("Save") { Task { await save() } }
                        .fontWeight(.semibold)
                        .disabled(draft.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func save() async {
        guard let userId = session.userId else { return }
        isSaving = true
        errorMessage = nil
        do {
            let payload = draft.toPayload(userId: userId)
            switch mode {
            case .create:
                try await SupabaseService.client.from("products").insert(payload).execute()
            case .edit(let productId):
                try await SupabaseService.client
                    .from("products")
                    .update(ProductUpdatePayload(from: payload))
                    .eq("id", value: productId)
                    .execute()
            }
            Haptics.success()
            onSaved()
        } catch {
            Haptics.error()
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
