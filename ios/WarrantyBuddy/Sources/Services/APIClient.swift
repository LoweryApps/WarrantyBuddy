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
}
