import SwiftUI

// Mirrors src/lib/warranty.ts's WarrantyStatus/warrantyStatus/formatDateLabel/
// estimateStandardWarrantyEndDate. Shared by the Vault grid and Claim Assist's
// warranty-window step.
enum WarrantyStatus {
    case active, expiring, expired, noWarranty

    static func compute(endDate: String?) -> WarrantyStatus {
        guard let endDate, let date = parseDateOnly(endDate) else { return .active }
        let days = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: date).day ?? 0
        if days < 0 { return .expired }
        if days <= 60 { return .expiring }
        return .active
    }

    static func daysUntil(_ dateString: String) -> Int? {
        guard let date = parseDateOnly(dateString) else { return nil }
        return Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: date).day
    }

    static func parseDateOnly(_ string: String) -> Date? {
        let parts = string.prefix(10).split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var components = DateComponents()
        components.year = parts[0]; components.month = parts[1]; components.day = parts[2]
        return Calendar.current.date(from: components)
    }

    static func monthYearLabel(_ dateString: String) -> String {
        guard let date = parseDateOnly(dateString) else { return dateString }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM yyyy"
        return formatter.string(from: date)
    }

    static func longDateLabel(_ dateString: String) -> String {
        guard let date = parseDateOnly(dateString) else { return dateString }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM d, yyyy"
        return formatter.string(from: date)
    }

    // Standard 1-year manufacturer term estimated from purchase date, used
    // only when no real warranty record exists on file — always surfaced to
    // the user as an estimate, never presented as fact.
    static func estimateStandardWarrantyEndDate(from purchaseDate: String) -> String? {
        guard let date = parseDateOnly(purchaseDate) else { return nil }
        guard let end = Calendar.current.date(byAdding: .year, value: 1, to: date) else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: end)
    }

    var label: String {
        switch self {
        case .active: return "Active"
        case .expiring: return "Expiring"
        case .expired: return "Expired"
        case .noWarranty: return "No warranty"
        }
    }

    var icon: String? {
        switch self {
        case .active: return "checkmark"
        case .expiring: return "clock"
        case .expired: return "xmark"
        case .noWarranty: return nil
        }
    }

    var color: Color {
        switch self {
        case .active: return .brandTeal
        case .expiring: return .brandAmber
        case .expired: return .brandRed
        case .noWarranty: return .brandInk
        }
    }
}
