import Foundation

// Mirrors PidSeverity/PidSource in src/lib/supabase/types.ts.
enum PidSeverity: String, Codable {
    case safetyHazard = "Safety Hazard"
    case major = "Major"
    case minor = "Minor"
}

enum PidSource: String, Codable {
    case saferProducts = "SaferProducts"
    case nhtsa = "NHTSA"
    case userReport = "UserReport"
    case reviewMining = "ReviewMining"
    case manufacturerBulletin = "ManufacturerBulletin"

    // Mirrors PID_SOURCE_LABEL in src/lib/product-intelligence.ts.
    var label: String {
        switch self {
        case .saferProducts: return "SaferProducts.gov reports"
        case .nhtsa: return "NHTSA complaints"
        case .userReport: return "WarrantyBuddy user reports"
        case .reviewMining: return "product review mentions"
        case .manufacturerBulletin: return "manufacturer bulletin"
        }
    }
}

// Mirrors the `product_intelligence` row shape used by KnownIssueRecord on
// the web (known-issue-banner.tsx).
struct KnownIssueRecord: Codable {
    let modelNumber: String?
    let failureType: String
    let failureDescription: String?
    let complaintCount: Int
    let severity: PidSeverity
    let source: PidSource
    let sourceURL: String?

    enum CodingKeys: String, CodingKey {
        case modelNumber = "model_number"
        case failureType = "failure_type"
        case failureDescription = "failure_description"
        case complaintCount = "complaint_count"
        case severity, source
        case sourceURL = "source_url"
    }
}

extension Array where Element == KnownIssueRecord {
    // Direct port of bestPidMatches() in src/lib/product-intelligence.ts:
    // keep unspecific-model records or an exact model match, ranked by
    // complaint count.
    func bestMatch(modelNumber: String?) -> KnownIssueRecord? {
        let modelLower = (modelNumber ?? "").lowercased()
        return self
            .filter { $0.modelNumber == nil || $0.modelNumber?.lowercased() == modelLower }
            .sorted { $0.complaintCount > $1.complaintCount }
            .first
    }
}

// Shared "does this product have a known issue?" lookup, reused by every
// surfacing point (Warranty tab, Claim Assist, Add Product success) so the
// query pattern stays identical everywhere instead of copy-pasted 3x.
enum ProductIntelligenceService {
    static func lookup(brand: String, modelNumber: String?) async -> KnownIssueRecord? {
        let trimmedBrand = brand.trimmingCharacters(in: .whitespaces)
        guard !trimmedBrand.isEmpty else { return nil }
        let matches: [KnownIssueRecord] = (try? await SupabaseService.client
            .from("product_intelligence")
            .select("model_number, failure_type, failure_description, complaint_count, severity, source, source_url")
            .ilike("brand", value: trimmedBrand)
            .eq("is_active", value: true)
            .execute()
            .value) ?? []
        return matches.bestMatch(modelNumber: modelNumber)
    }
}
