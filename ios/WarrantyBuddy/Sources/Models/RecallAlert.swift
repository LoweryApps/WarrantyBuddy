import Foundation

// Decodes the embedded-resource query joining user_recall_alerts with its
// parent recalls + products rows (mirrors RecallAlertWithProduct in
// src/components/recalls/types.ts).
struct RecallAlert: Codable, Identifiable, Hashable {
    let id: String
    let acknowledged: Bool
    let notifiedAt: String
    let recalls: RecallInfo?
    let products: ProductInfo?

    enum CodingKeys: String, CodingKey {
        case id, acknowledged
        case notifiedAt = "notified_at"
        case recalls, products
    }

    struct RecallInfo: Codable, Hashable {
        let id: String
        let source: String
        let recallDate: String?
        let description: String?
        let remedy: String?
        let actionUrl: String?

        enum CodingKeys: String, CodingKey {
            case id, source
            case recallDate = "recall_date"
            case description, remedy
            case actionUrl = "action_url"
        }
    }

    struct ProductInfo: Codable, Hashable {
        let id: String
        let name: String
        let brand: String?
        let modelNumber: String?
        let category: String

        enum CodingKeys: String, CodingKey {
            case id, name, brand
            case modelNumber = "model_number"
            case category
        }
    }

    /// Best-effort sort key: recall date if we have it, otherwise when we
    /// notified the user — same fallback the web app's RecallsPage uses.
    var sortDate: String {
        recalls?.recallDate ?? notifiedAt
    }
}
