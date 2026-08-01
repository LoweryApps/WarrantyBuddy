import Foundation

// Direct port of src/lib/claim-readiness.ts — keep these in sync.
enum ClaimReadinessFactor {
    case receipt, purchaseDate, serialNumber
}

enum ClaimReadinessBand: String {
    case needsAttention = "Needs attention"
    case almostThere = "Almost there"
    case claimReady = "Claim ready"
}

struct ClaimReadinessResult {
    let score: Int
    let missing: [ClaimReadinessFactor]
    let band: ClaimReadinessBand
}

enum ClaimReadiness {
    private static let receiptWeight = 40
    private static let purchaseDateWeight = 30
    private static let serialNumberWeight = 30

    static func compute(hasReceipt: Bool, purchaseDate: String?, serialNumber: String?) -> ClaimReadinessResult {
        var missing: [ClaimReadinessFactor] = []
        var score = 0

        if hasReceipt {
            score += receiptWeight
        } else {
            missing.append(.receipt)
        }

        if purchaseDate != nil && !(purchaseDate?.isEmpty ?? true) {
            score += purchaseDateWeight
        } else {
            missing.append(.purchaseDate)
        }

        if serialNumber != nil && !(serialNumber?.isEmpty ?? true) {
            score += serialNumberWeight
        } else {
            missing.append(.serialNumber)
        }

        let band: ClaimReadinessBand
        if score >= 80 {
            band = .claimReady
        } else if score >= 40 {
            band = .almostThere
        } else {
            band = .needsAttention
        }

        return ClaimReadinessResult(score: score, missing: missing, band: band)
    }
}
