import SwiftUI
import UIKit

// Brand palette, mirrors the web app's tailwind.config.ts token values exactly.
extension Color {
    static let brandNavy = Color(red: 0x0F / 255, green: 0x1F / 255, blue: 0x3D / 255)
    static let brandTeal = Color(red: 0x00 / 255, green: 0xC2 / 255, blue: 0xA8 / 255)
    static let brandAmber = Color(red: 0xF5 / 255, green: 0x9E / 255, blue: 0x0B / 255)
    static let brandRed = Color(red: 0xE2 / 255, green: 0x4B / 255, blue: 0x4A / 255)
    static let brandCloud = Color(red: 0xF4 / 255, green: 0xF6 / 255, blue: 0xF8 / 255)
    static let brandInk = Color(red: 0x5B / 255, green: 0x6B / 255, blue: 0x82 / 255)
}

enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
}

enum Radius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
}

// Reusable card container — matches the web's `rounded-xl border bg-white`
// panel treatment exactly: a flat 1px border, no drop shadow.
struct CardBackground: ViewModifier {
    var padding: CGFloat = Spacing.lg
    var borderColor: Color = Color(.separator).opacity(0.5)

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                    .stroke(borderColor, lineWidth: 1)
            )
    }
}

extension View {
    func cardStyle(padding: CGFloat = Spacing.lg, borderColor: Color = Color(.separator).opacity(0.5)) -> some View {
        modifier(CardBackground(padding: padding, borderColor: borderColor))
    }
}

// Reusable inline error banner, matches the web's alert styling.
struct ErrorBanner: View {
    let message: String

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundStyle(Color.brandRed)
            Text(message)
                .font(.brandBody(13))
                .foregroundStyle(Color.brandRed)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.brandRed.opacity(0.08), in: RoundedRectangle(cornerRadius: Radius.sm))
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets())
    }
}

// Direct port of known-issue-banner.tsx — surfaces an aggregated
// product_intelligence record (NHTSA complaints / user reports) at the same
// 3 points the web shows it: Warranty tab, Claim Assist, Add Product success.
struct KnownIssueBanner: View {
    let record: KnownIssueRecord

    @State private var showingSource = false

    private var tone: Color {
        switch record.severity {
        case .safetyHazard: return .brandRed
        case .major: return .brandAmber
        case .minor: return .brandInk
        }
    }

    private var background: Color {
        record.severity == .minor ? .brandCloud : tone
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(tone)
                Text("\(record.severity == .safetyHazard ? "Safety issue reported" : "Known issue reported"): \(record.failureType)")
                    .font(.brandBody(11, weight: .medium))
                    .foregroundStyle(tone)
            }

            if let description = record.failureDescription, !description.isEmpty {
                Text(description)
                    .font(.brandBody(11))
                    .foregroundStyle(tone.opacity(0.9))
            }

            HStack(spacing: 4) {
                Image(systemName: "doc.text").font(.caption2)
                Text("\(record.complaintCount) \(record.source.label)")
                if let sourceURL = record.sourceURL, let url = URL(string: sourceURL) {
                    Text("·")
                    Button("Official source") { showingSource = true }
                        .font(.brandBody(10, weight: .medium))
                        .underline()
                        .sheet(isPresented: $showingSource) { SafariView(url: url) }
                }
            }
            .font(.brandBody(10))
            .foregroundStyle(tone.opacity(0.75))

            Text("This information is based on publicly available complaint data and user reports. WarrantyBuddy does not independently verify these reports.")
                .font(.brandBody(9))
                .foregroundStyle(tone.opacity(0.6))
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(background.opacity(record.severity == .minor ? 1 : 0.06), in: RoundedRectangle(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(tone.opacity(record.severity == .minor ? 0 : 0.3)))
    }
}

// Small reusable "copy to clipboard" button — Claim Assist's Step 3 uses this
// repeatedly (claim contact, model number, serial number, VIN).
struct CopyButton: View {
    let value: String
    var label: String = "Copy"

    @State private var copied = false

    var body: some View {
        Button {
            UIPasteboard.general.string = value
            Haptics.light()
            withAnimation { copied = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                withAnimation { copied = false }
            }
        } label: {
            Image(systemName: copied ? "checkmark" : "doc.on.doc")
                .font(.caption2)
        }
        .foregroundStyle(copied ? Color.brandTeal : Color.brandInk)
        .accessibilityLabel(label)
    }
}
