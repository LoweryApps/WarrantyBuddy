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
