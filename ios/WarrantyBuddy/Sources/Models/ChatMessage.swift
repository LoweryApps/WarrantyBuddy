import Foundation

// Mirrors the `chat_messages` table exactly (src/lib/supabase/types.ts).
struct ChatMessage: Codable, Identifiable, Hashable {
    let id: String
    let role: String
    let content: String
    let source: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, role, content, source
        case createdAt = "created_at"
    }

    var isUser: Bool { role == "user" }
}
