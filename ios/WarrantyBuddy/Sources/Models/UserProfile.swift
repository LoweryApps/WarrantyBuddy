import Foundation

// Subset of the `users` table needed for Settings (mirrors the columns
// src/app/(app)/settings/page.tsx selects).
struct UserProfile: Codable, Hashable {
    var fullName: String?
    var phone: String?
    var claimEmail: String?
    var notificationEmail: Bool
    var forwardingAddress: String
    var subscriptionStatus: String?
    var plan: String?
    var currentPeriodEnd: String?

    enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
        case phone
        case claimEmail = "claim_email"
        case notificationEmail = "notification_email"
        case forwardingAddress = "forwarding_address"
        case subscriptionStatus = "subscription_status"
        case plan
        case currentPeriodEnd = "current_period_end"
    }
}

struct UserProfileUpdatePayload: Encodable {
    let fullName: String?
    let phone: String?
    let claimEmail: String?
    let notificationEmail: Bool

    enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
        case phone
        case claimEmail = "claim_email"
        case notificationEmail = "notification_email"
    }
}
