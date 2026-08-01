import Foundation

// Matches the `warranties` table exactly (src/lib/supabase/types.ts).
struct Warranty: Codable, Identifiable, Hashable {
    let id: String
    let productId: String
    let warrantyType: String
    let startDate: String?
    let endDate: String?
    let coverageDescription: String?
    let exclusions: String?
    let claimContact: String?
    let documentUrl: String?
    let warrantySource: String
    let createdAt: String
    let expiryNotifiedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case productId = "product_id"
        case warrantyType = "warranty_type"
        case startDate = "start_date"
        case endDate = "end_date"
        case coverageDescription = "coverage_description"
        case exclusions
        case claimContact = "claim_contact"
        case documentUrl = "document_url"
        case warrantySource = "warranty_source"
        case createdAt = "created_at"
        case expiryNotifiedAt = "expiry_notified_at"
    }
}
