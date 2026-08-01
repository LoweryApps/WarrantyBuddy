import Foundation

// Matches ReceiptDraft in src/components/receipts/types.ts (subset of the
// `forwarded_receipts` table columns the review queue needs).
struct ForwardedReceiptDraft: Codable, Identifiable, Hashable {
    let id: String
    let kind: String // "receipt" | "warranty" | "both"
    let sourceEmailSubject: String?
    let senderDomain: String?
    let extractedProductName: String?
    let extractedBrand: String?
    let extractedPrice: Double?
    let extractedOrderDate: String?
    let extractedOrderNumber: String?
    let extractedRetailer: String?
    let extractedWarrantyStartDate: String?
    let extractedWarrantyEndDate: String?
    let extractedCoverageDescription: String?
    let extractedExclusions: String?
    let extractedClaimContact: String?
    let confidenceScore: Double?
    let rawEmailUrl: String?
    let receivedAt: String
    let discardedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, kind
        case sourceEmailSubject = "source_email_subject"
        case senderDomain = "sender_domain"
        case extractedProductName = "extracted_product_name"
        case extractedBrand = "extracted_brand"
        case extractedPrice = "extracted_price"
        case extractedOrderDate = "extracted_order_date"
        case extractedOrderNumber = "extracted_order_number"
        case extractedRetailer = "extracted_retailer"
        case extractedWarrantyStartDate = "extracted_warranty_start_date"
        case extractedWarrantyEndDate = "extracted_warranty_end_date"
        case extractedCoverageDescription = "extracted_coverage_description"
        case extractedExclusions = "extracted_exclusions"
        case extractedClaimContact = "extracted_claim_contact"
        case confidenceScore = "confidence_score"
        case rawEmailUrl = "raw_email_url"
        case receivedAt = "received_at"
        case discardedAt = "discarded_at"
    }

    var isWarranty: Bool { kind == "warranty" || kind == "both" }
}

struct ConfirmReceiptPayload: Encodable {
    let draftId: String
    let productId: String?
    let productName: String
    let brand: String
    let retailer: String
    let orderDate: String
    let price: String
    let warrantyStart: String
    let warrantyEnd: String
    let coverage: String
    let exclusions: String
    let claimContact: String
}
