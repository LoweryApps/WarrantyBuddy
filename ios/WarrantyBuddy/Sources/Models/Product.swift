import Foundation

// Matches the `products` table exactly (src/lib/supabase/types.ts).
// Date columns are decoded as raw strings (not Date) since "purchase_date"
// is a plain SQL `date` (YYYY-MM-DD) while "created_at" is a full
// timestamptz — mixing both under one DateDecodingStrategy is fragile, so
// callers format these explicitly for display instead.
struct Product: Codable, Identifiable, Hashable {
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
    }
}
