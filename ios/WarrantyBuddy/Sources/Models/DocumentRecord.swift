import Foundation

// Matches the `documents` table (src/lib/supabase/types.ts).
struct DocumentRecord: Codable, Identifiable, Hashable {
    let id: String
    let productId: String
    let documentType: String
    let fileUrl: String
    let fileName: String
    let fileSizeKb: Int?
    let uploadedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case productId = "product_id"
        case documentType = "document_type"
        case fileUrl = "file_url"
        case fileName = "file_name"
        case fileSizeKb = "file_size_kb"
        case uploadedAt = "uploaded_at"
    }
}

struct DocumentInsertPayload: Encodable {
    let productId: String
    let documentType: String
    let fileUrl: String
    let fileName: String
    let fileSizeKb: Int?

    enum CodingKeys: String, CodingKey {
        case productId = "product_id"
        case documentType = "document_type"
        case fileUrl = "file_url"
        case fileName = "file_name"
        case fileSizeKb = "file_size_kb"
    }
}
