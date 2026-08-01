import Foundation

// Decodes the result of a Supabase embedded-resource query
// (`.select("*, warranties(*)")`) — Product's own columns plus its nested
// warranties array. Kept separate from `Product` so that struct stays a
// 1:1 mirror of the `products` table row shape.
struct ProductWithWarranties: Codable, Identifiable, Hashable {
    let id: String
    let userId: String
    let name: String
    let brand: String?
    let modelNumber: String?
    let serialNumber: String?
    let category: String
    let vin: String?
    let modelYear: Int?
    let roomLocation: String?
    let quantity: Int
    let purchaseDate: String?
    let purchasePrice: Double?
    let retailer: String?
    let photoUrl: String?
    let createdAt: String
    let warranties: [Warranty]

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case brand
        case modelNumber = "model_number"
        case serialNumber = "serial_number"
        case category
        case vin
        case modelYear = "model_year"
        case roomLocation = "room_location"
        case quantity
        case purchaseDate = "purchase_date"
        case purchasePrice = "purchase_price"
        case retailer
        case photoUrl = "photo_url"
        case createdAt = "created_at"
        case warranties
    }

    var product: Product {
        Product(
            id: id, userId: userId, name: name, brand: brand,
            modelNumber: modelNumber, serialNumber: serialNumber, category: category,
            vin: vin, modelYear: modelYear, roomLocation: roomLocation, quantity: quantity,
            purchaseDate: purchaseDate, purchasePrice: purchasePrice, retailer: retailer,
            photoUrl: photoUrl, createdAt: createdAt
        )
    }

    /// Most relevant warranty to show: prefer the one with the latest end date.
    var primaryWarranty: Warranty? {
        warranties.max { ($0.endDate ?? "") < ($1.endDate ?? "") }
    }
}
