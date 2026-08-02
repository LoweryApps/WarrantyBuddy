import SwiftUI
import CoreText

// Registers the bundled variable font files and exposes SwiftUI Font helpers
// that pick a specific weight out of them, mirroring the web app's
// font-display (Space Grotesk, bold) / body (Hanken Grotesk) split.
enum BrandFonts {
    static func registerAll() {
        for resource in ["SpaceGrotesk-Variable", "HankenGrotesk-Variable"] {
            guard let url = Bundle.main.url(forResource: resource, withExtension: "ttf") else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }
}

// 'wght' axis tag, per the OpenType variation-axis spec.
private let weightAxisTag: UInt32 = 0x77676874
private let variationAttribute = UIFontDescriptor.AttributeName(rawValue: "NSCTFontVariationAttribute")

private func variableFont(postscriptName: String, size: CGFloat, weight: CGFloat) -> UIFont {
    guard let base = UIFont(name: postscriptName, size: size) else {
        return .systemFont(ofSize: size)
    }
    let descriptor = base.fontDescriptor.addingAttributes([
        variationAttribute: [weightAxisTag: weight]
    ])
    return UIFont(descriptor: descriptor, size: size)
}

extension UIFont {
    // Space Grotesk, always bold — for UIKit call sites (e.g. UINavigationBarAppearance).
    static func brandDisplay(_ size: CGFloat) -> UIFont {
        variableFont(postscriptName: "SpaceGrotesk-Light", size: size, weight: 700)
    }
}

extension Font {
    // Space Grotesk, always bold — matches the web's headings.
    static func brandDisplay(_ size: CGFloat) -> Font {
        Font(UIFont.brandDisplay(size))
    }

    // Hanken Grotesk, weight-adjustable — matches the web's body text.
    static func brandBody(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let wght: CGFloat
        switch weight {
        case .bold, .heavy, .black: wght = 700
        case .semibold: wght = 600
        case .medium: wght = 500
        default: wght = 400
        }
        return Font(variableFont(postscriptName: "HankenGrotesk-Regular", size: size, weight: wght))
    }
}
