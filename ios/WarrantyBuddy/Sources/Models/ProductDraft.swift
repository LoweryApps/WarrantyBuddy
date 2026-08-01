import Foundation

let productCategories = ["Electronics", "Appliance", "Tool", "Vehicle", "Other"]

// Mutable form state for the Add/Edit Product screens — mirrors the fields
// add-product-wizard.tsx collects, minus vin/model_year (vehicle-specific,
// deferred).
struct ProductDraft {
    var name = ""
    var brand = ""
    var modelNumber = ""
    var serialNumber = ""
    var category = "Other"
    var roomLocation = ""
    var quantity = "1"
    var purchaseDate: Date?
    var purchasePrice = ""
    var retailer = ""

    static func from(_ product: Product) -> ProductDraft {
        var draft = ProductDraft()
        draft.name = product.name
        draft.brand = product.brand ?? ""
        draft.modelNumber = product.modelNumber ?? ""
        draft.serialNumber = product.serialNumber ?? ""
        draft.category = product.category
        draft.roomLocation = product.roomLocation ?? ""
        draft.quantity = String(product.quantity)
        draft.purchaseDate = ProductDraft.isoDateFormatter.date(from: product.purchaseDate ?? "")
        draft.purchasePrice = product.purchasePrice.map { String($0) } ?? ""
        draft.retailer = product.retailer ?? ""
        return draft
    }

    static let isoDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    /// Fields as a Supabase-ready payload (nil for empty strings, matching
    /// the nullable columns in the `products` table).
    func toPayload(userId: String) -> ProductInsertPayload {
        ProductInsertPayload(
            userId: userId,
            name: name.trimmingCharacters(in: .whitespaces),
            brand: brand.isEmpty ? nil : brand,
            modelNumber: modelNumber.isEmpty ? nil : modelNumber,
            serialNumber: serialNumber.isEmpty ? nil : serialNumber,
            category: category,
            roomLocation: roomLocation.isEmpty ? nil : roomLocation,
            quantity: Int(quantity) ?? 1,
            purchaseDate: purchaseDate.map { ProductDraft.isoDateFormatter.string(from: $0) },
            purchasePrice: Double(purchasePrice),
            retailer: retailer.isEmpty ? nil : retailer
        )
    }
}

struct ProductInsertPayload: Encodable {
    let userId: String
    let name: String
    let brand: String?
    let modelNumber: String?
    let serialNumber: String?
    let category: String
    let roomLocation: String?
    let quantity: Int
    let purchaseDate: String?
    let purchasePrice: Double?
    let retailer: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case name, brand
        case modelNumber = "model_number"
        case serialNumber = "serial_number"
        case category
        case roomLocation = "room_location"
        case quantity
        case purchaseDate = "purchase_date"
        case purchasePrice = "purchase_price"
        case retailer
    }
}

/// Same shape without user_id, for updates (RLS already scopes to the
/// owner; user_id never needs to change on an edit).
struct ProductUpdatePayload: Encodable {
    let name: String
    let brand: String?
    let modelNumber: String?
    let serialNumber: String?
    let category: String
    let roomLocation: String?
    let quantity: Int
    let purchaseDate: String?
    let purchasePrice: Double?
    let retailer: String?

    enum CodingKeys: String, CodingKey {
        case name, brand
        case modelNumber = "model_number"
        case serialNumber = "serial_number"
        case category
        case roomLocation = "room_location"
        case quantity
        case purchaseDate = "purchase_date"
        case purchasePrice = "purchase_price"
        case retailer
    }

    init(from payload: ProductInsertPayload) {
        name = payload.name
        brand = payload.brand
        modelNumber = payload.modelNumber
        serialNumber = payload.serialNumber
        category = payload.category
        roomLocation = payload.roomLocation
        quantity = payload.quantity
        purchaseDate = payload.purchaseDate
        purchasePrice = payload.purchasePrice
        retailer = payload.retailer
    }
}
