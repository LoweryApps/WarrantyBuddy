import Foundation

// Thin structs for Claim Assist, mirroring src/components/claims/types.ts
// field-for-field — only what steps 1-3 display, not the full Product/
// Warranty models.
struct ClaimProduct: Codable {
    let id: String
    let name: String
    let brand: String?
    let modelNumber: String?
    let serialNumber: String?
    let category: String
    let vin: String?
    let purchaseDate: String?
    let purchasePrice: Double?
    let retailer: String?

    enum CodingKeys: String, CodingKey {
        case id, name, brand
        case modelNumber = "model_number"
        case serialNumber = "serial_number"
        case category, vin
        case purchaseDate = "purchase_date"
        case purchasePrice = "purchase_price"
        case retailer
    }
}

struct ClaimWarranty: Codable {
    let warrantyType: String
    let startDate: String?
    let endDate: String?
    let claimContact: String?

    enum CodingKeys: String, CodingKey {
        case warrantyType = "warranty_type"
        case startDate = "start_date"
        case endDate = "end_date"
        case claimContact = "claim_contact"
    }
}

struct ClaimReceipt: Codable {
    let fileName: String

    enum CodingKeys: String, CodingKey {
        case fileName = "file_name"
    }
}

struct ClaimRecall: Codable {
    let source: String
    let externalRecallId: String
    let description: String?
    let remedy: String?

    enum CodingKeys: String, CodingKey {
        case source
        case externalRecallId = "external_recall_id"
        case description, remedy
    }
}
