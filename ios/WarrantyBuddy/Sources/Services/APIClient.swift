import Foundation

// Talks to the Next.js API for the one feature that needs a server secret
// (ANTHROPIC_API_KEY): photo/AI extraction. Everything else in this app
// goes straight to Supabase — see src/lib/supabase/server.ts's
// getUserFromRequest() on the backend for the matching Bearer-token path.
enum ExtractKind: String {
    case label, receipt, warranty
}

struct ExtractedLabel: Decodable {
    let brand: String?
    let modelNumber: String?
    let serialNumber: String?

    enum CodingKeys: String, CodingKey {
        case brand
        case modelNumber = "model_number"
        case serialNumber = "serial_number"
    }
}

struct ExtractedReceipt: Decodable {
    let productName: String?
    let brand: String?
    let modelNumber: String?
    let price: Double?
    let purchaseDate: String?
    let retailer: String?

    enum CodingKeys: String, CodingKey {
        case productName = "product_name"
        case brand
        case modelNumber = "model_number"
        case price
        case purchaseDate = "purchase_date"
        case retailer
    }
}

struct ExtractedWarranty: Decodable {
    let startDate: String?
    let endDate: String?
    let coverageDescription: String?
    let exclusions: String?
    let claimContact: String?
    let uncertain: [String]

    enum CodingKeys: String, CodingKey {
        case startDate = "start_date"
        case endDate = "end_date"
        case coverageDescription = "coverage_description"
        case exclusions
        case claimContact = "claim_contact"
        case uncertain
    }
}

enum APIError: LocalizedError {
    case notAuthenticated
    case server(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated: return "You're not signed in."
        case .server(let message): return message
        }
    }
}

enum APIClient {
    static let baseURL = URL(string: "https://www.mywarrantybuddy.com")!

    private struct ExtractEnvelope<T: Decodable>: Decodable {
        let ok: Bool?
        let data: T?
        let error: String?
        let message: String?
    }

    static func extract<T: Decodable>(kind: ExtractKind, imageData: Data, mimeType: String) async throws -> T {
        guard let accessToken = try? await SupabaseService.client.auth.session.accessToken else {
            throw APIError.notAuthenticated
        }

        var request = URLRequest(url: baseURL.appendingPathComponent("api/extract"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        func appendField(_ name: String, _ value: String) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }
        appendField("kind", kind.rawValue)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"upload.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let (responseData, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0

        let envelope = try JSONDecoder().decode(ExtractEnvelope<T>.self, from: responseData)
        guard status == 200, let data = envelope.data else {
            throw APIError.server(envelope.message ?? "Extraction failed (\(status)).")
        }
        return data
    }

    private struct InsuranceExportResponse: Decodable {
        let ok: Bool?
        let downloadUrl: String?
        let error: String?
        let message: String?
    }

    /// Full-vault insurance-inventory PDF (matches the "vault" scope on the
    /// web's /insurance-export page — per-room/per-category scoping isn't
    /// exposed natively yet). Returns a signed, time-limited download URL.
    static func generateInsuranceExport() async throws -> URL {
        guard let accessToken = try? await SupabaseService.client.auth.session.accessToken else {
            throw APIError.notAuthenticated
        }
        var request = URLRequest(url: baseURL.appendingPathComponent("api/insurance-export"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["scope": "vault"])

        let (responseData, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let envelope = try JSONDecoder().decode(InsuranceExportResponse.self, from: responseData)
        guard status == 200, let urlString = envelope.downloadUrl, let url = URL(string: urlString) else {
            throw APIError.server(envelope.message ?? envelope.error ?? "Export failed (\(status)).")
        }
        return url
    }

    private struct BillingPortalResponse: Decodable {
        let url: String?
        let error: String?
        let message: String?
    }

    /// Opens a Stripe billing-portal session for the signed-in user's
    /// existing subscription (matches PlanSection.tsx's "Manage subscription"
    /// button). Only callable when the user actually has a subscription —
    /// the backend 400s with "No subscription on file" otherwise.
    static func createBillingPortalSession() async throws -> URL {
        guard let accessToken = try? await SupabaseService.client.auth.session.accessToken else {
            throw APIError.notAuthenticated
        }
        var request = URLRequest(url: baseURL.appendingPathComponent("api/stripe/portal"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (responseData, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let envelope = try JSONDecoder().decode(BillingPortalResponse.self, from: responseData)
        guard status == 200, let urlString = envelope.url, let url = URL(string: urlString) else {
            throw APIError.server(envelope.message ?? envelope.error ?? "Couldn't open the billing portal (\(status)).")
        }
        return url
    }

    private struct DeleteAccountResponse: Decodable {
        let ok: Bool?
        let error: String?
    }

    /// Permanently deletes the signed-in user's account and all their data
    /// (server-side: storage files, then the Supabase Auth user itself).
    /// Irreversible — callers must confirm with the user before calling this.
    static func deleteAccount() async throws {
        guard let accessToken = try? await SupabaseService.client.auth.session.accessToken else {
            throw APIError.notAuthenticated
        }
        var request = URLRequest(url: baseURL.appendingPathComponent("api/account/delete"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (responseData, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else {
            let envelope = try? JSONDecoder().decode(DeleteAccountResponse.self, from: responseData)
            throw APIError.server(envelope?.error ?? "Couldn't delete your account (\(status)).")
        }
    }

    private struct ConfirmReceiptResponse: Decodable {
        let ok: Bool?
        let productId: String?
        let error: String?
        let message: String?
    }

    /// Confirms a forwarded_receipts draft — server-side this creates (or
    /// links to) a product, inserts the warranty/document rows, checks for
    /// a recall match, and enforces the free-tier monthly receipt limit /
    /// Premium gating for warranty-kind drafts. Returns the resulting
    /// product id.
    @discardableResult
    static func confirmReceipt(_ payload: ConfirmReceiptPayload) async throws -> String {
        guard let accessToken = try? await SupabaseService.client.auth.session.accessToken else {
            throw APIError.notAuthenticated
        }
        var request = URLRequest(url: baseURL.appendingPathComponent("api/forwarded-receipts/confirm"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)

        let (responseData, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let envelope = try JSONDecoder().decode(ConfirmReceiptResponse.self, from: responseData)
        guard status == 200, let productId = envelope.productId else {
            throw APIError.server(envelope.message ?? envelope.error ?? "Couldn't confirm this receipt (\(status)).")
        }
        return productId
    }

    private struct ClaimEmailPayload: Encodable {
        let productId: String
        let issue: String
    }

    private struct ClaimEmailResponse: Decodable {
        let email: String?
        let source: String?
        let error: String?
        let message: String?
    }

    /// Drafts an AI warranty-claim email grounded in the product's actual
    /// warranty document/terms when one is on file (Claim Assist Step 5).
    /// `source` is "ai" or "template" (deterministic fallback when no
    /// warranty doc / model call fails) — mirrors the web's response shape.
    static func draftClaimEmail(productId: String, issue: String) async throws -> (email: String, source: String) {
        guard let accessToken = try? await SupabaseService.client.auth.session.accessToken else {
            throw APIError.notAuthenticated
        }
        var request = URLRequest(url: baseURL.appendingPathComponent("api/claim-email"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(ClaimEmailPayload(productId: productId, issue: issue))

        let (responseData, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let envelope = try JSONDecoder().decode(ClaimEmailResponse.self, from: responseData)
        guard status == 200, let email = envelope.email else {
            throw APIError.server(envelope.message ?? envelope.error ?? "Couldn't draft the email (\(status)).")
        }
        return (email, envelope.source ?? "ai")
    }

    struct WarrantySearchResult: Decodable {
        let found: Bool
        let warrantyType: String?
        let durationMonths: Int?
        let coverageDescription: String?
        let exclusions: String?
        let claimContact: String?
        let sourceNote: String?
        let reason: String?

        enum CodingKeys: String, CodingKey {
            case found
            case warrantyType = "warranty_type"
            case durationMonths = "duration_months"
            case coverageDescription = "coverage_description"
            case exclusions
            case claimContact = "claim_contact"
            case sourceNote = "source_note"
            case reason
        }
    }

    private struct WarrantySearchPayload: Encodable {
        let productId: String
    }

    private struct WarrantySearchEnvelope: Decodable {
        let ok: Bool?
        let data: WarrantySearchResult?
        let error: String?
        let message: String?
    }

    /// Web-searches for a product's manufacturer warranty terms (Warranty tab's
    /// "Search for warranty terms" action) — grounds nothing locally, purely a
    /// web_search-tool-backed model call server-side. Throws with the exact
    /// server message on failure, including "missing_brand" (product needs a
    /// brand set first) — a real, actionable error the user needs to see.
    static func searchWarranty(productId: String) async throws -> WarrantySearchResult {
        guard let accessToken = try? await SupabaseService.client.auth.session.accessToken else {
            throw APIError.notAuthenticated
        }
        var request = URLRequest(url: baseURL.appendingPathComponent("api/warranty-search"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(WarrantySearchPayload(productId: productId))

        let (responseData, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let envelope = try JSONDecoder().decode(WarrantySearchEnvelope.self, from: responseData)
        guard status == 200, let result = envelope.data else {
            throw APIError.server(envelope.message ?? envelope.error ?? "Couldn't search for warranty terms (\(status)).")
        }
        return result
    }
}
